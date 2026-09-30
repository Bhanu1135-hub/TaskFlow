from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import Client, create_client


class Settings(BaseSettings):
    supabase_url: str
    supabase_publishable_key: str

    model_config = SettingsConfigDict(
        env_file=Path(__file__).with_name(".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Title cannot be blank.")
        return title


class TaskUpdate(BaseModel):
    status: Literal["Todo", "In progress", "Done"]


class TaskResponse(BaseModel):
    id: str
    title: str
    project: str
    owner: str = "You"
    priority: Literal["High", "Medium", "Low"]
    status: Literal["Todo", "In progress", "Done"]
    due: str


def create_supabase_client(access_token: str) -> Client:
    settings = Settings()
    client = create_client(settings.supabase_url, settings.supabase_publishable_key)
    client.postgrest.auth(access_token)
    return client


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    client: Client


bearer_scheme = HTTPBearer(auto_error=False)
app = FastAPI(title="TaskFlow API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def require_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in is required.")

    client = create_supabase_client(credentials.credentials)
    try:
        response = client.auth.get_user(credentials.credentials)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Supabase session is invalid or expired.",
        ) from error

    if response.user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in is required.")
    return AuthContext(user_id=str(response.user.id), client=client)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks(auth: AuthContext = Depends(require_auth_context)) -> list[TaskResponse]:
    try:
        response = (
            auth.client
            .table("tasks")
            .select("id, title, project, priority, status, due")
            .eq("user_id", auth.user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Could not load tasks from Supabase.") from error

    return [TaskResponse(**row) for row in response.data or []]


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    auth: AuthContext = Depends(require_auth_context),
) -> TaskResponse:
    try:
        response = (
            auth.client
            .table("tasks")
            .insert(
                {
                    "title": task.title.strip(),
                    "project": "Inbox",
                    "priority": "Medium",
                    "status": "Todo",
                    "due": "Today",
                    "user_id": auth.user_id,
                }
            )
            .select("id, title, project, priority, status, due")
            .execute()
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Could not create the task in Supabase.") from error

    if not response.data:
        raise HTTPException(status_code=502, detail="Supabase did not return the created task.")
    return TaskResponse(**response.data[0])


@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    task: TaskUpdate,
    auth: AuthContext = Depends(require_auth_context),
) -> TaskResponse:
    try:
        response = (
            auth.client
            .table("tasks")
            .update({"status": task.status})
            .eq("id", str(task_id))
            .eq("user_id", auth.user_id)
            .select("id, title, project, priority, status, due")
            .execute()
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Could not update the task in Supabase.") from error

    if not response.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskResponse(**response.data[0])
