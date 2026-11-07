"""Output models for the LLM calls that are not already API models."""

from pydantic import BaseModel, Field

from ..models import Persona, PersonaReaction


class DraftContent(BaseModel):
    brief: str
    caption: str
    visual_prompt: str
    hashtags: list[str] = []


class PersonasOut(BaseModel):
    personas: list[Persona] = Field(min_length=3, max_length=3)


class ReactionsOut(BaseModel):
    reactions: list[PersonaReaction]


class RegenerateContent(BaseModel):
    caption: str
    hashtags: list[str] = []
