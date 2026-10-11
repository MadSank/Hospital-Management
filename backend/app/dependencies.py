from typing import Callable, List, Optional, Union
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import RoleEnum, User
from app.utils.permissions import check_user_role, create_api_error
from app.utils.security import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that extracts, verifies the JWT, and loads the active User."""
    if not credentials or not credentials.credentials:
        raise create_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHENTICATED",
            message="Authentication credentials were not provided",
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise create_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN",
            message="Invalid or expired access token",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise create_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN_CLAIMS",
            message="Token payload is missing user identifier",
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise create_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN_SUBJECT",
            message="Subject claim must be a valid user ID",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise create_api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="USER_NOT_FOUND",
            message="User associated with token no longer exists",
        )

    if not user.is_active:
        raise create_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="ACCOUNT_DISABLED",
            message="This account has been deactivated. Contact an administrator.",
        )

    return user


def require_role(role: Union[str, RoleEnum]) -> Callable[[User], User]:
    """Dependency factory that restricts route access to a specific role."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not check_user_role(current_user, [role]):
            role_name = role.value if isinstance(role, RoleEnum) else str(role)
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN_ROLE",
                message=f"Access denied: this action requires the '{role_name}' role",
            )
        return current_user

    return role_checker


def require_any_role(*roles: Union[str, RoleEnum, List[Union[str, RoleEnum]]]) -> Callable[[User], User]:
    """Dependency factory that restricts route access to any of the specified roles."""
    flat_roles: List[Union[str, RoleEnum]] = []
    for r in roles:
        if isinstance(r, (list, tuple, set)):
            flat_roles.extend(r)
        else:
            flat_roles.append(r)

    def roles_checker(current_user: User = Depends(get_current_user)) -> User:
        if not check_user_role(current_user, flat_roles):
            role_names = [r.value if isinstance(r, RoleEnum) else str(r) for r in flat_roles]
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN_ROLE",
                message=f"Access denied: requires one of the following roles: {', '.join(role_names)}",
            )
        return current_user

    return roles_checker
