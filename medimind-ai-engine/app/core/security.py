import hmac

from fastapi import Header

from app.core.config import get_settings
from app.core.errors import UnauthorizedError


async def require_internal_secret(x_internal_secret: str = Header(default="")) -> None:
    expected = get_settings().INTERNAL_API_SECRET
    if not hmac.compare_digest(x_internal_secret.encode(), expected.encode()):
        raise UnauthorizedError()
