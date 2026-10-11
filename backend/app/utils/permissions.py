from typing import List, Union
from fastapi import HTTPException, status
from app.models.user import RoleEnum, User


def create_api_error(
    status_code: int,
    code: str,
    message: str,
    field: str = None,
    context: dict = None,
) -> HTTPException:
    """Create a standardized API exception matching API_SPECIFICATION.md format."""
    detail = {
        "code": code,
        "message": message,
    }
    if field:
        detail["field"] = field
    if context:
        detail["context"] = context
    return HTTPException(status_code=status_code, detail=detail)


def check_user_role(user: User, allowed_roles: List[Union[str, RoleEnum]]) -> bool:
    """Check if the given user has any of the allowed roles."""
    if not user.role:
        return False
    user_role_name = user.role.name.lower()
    allowed = [r.value.lower() if isinstance(r, RoleEnum) else str(r).lower() for r in allowed_roles]
    return user_role_name in allowed
