from rest_framework import permissions


ADMIN_GROUP = 'Admin'
STANDARD_GROUP = 'Standard'


def is_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name=ADMIN_GROUP).exists()


def is_standard(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name=STANDARD_GROUP).exists() or is_admin(user)


class IsAdmin(permissions.BasePermission):
    """Only Admin group members (or superusers) may access."""

    def has_permission(self, request, view):
        return is_admin(request.user)


class AdminOrStandardReadWrite(permissions.BasePermission):
    """Admins: full access. Standard: safe + create + update. Delete is admin-only."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return is_admin(user)
        return is_admin(user) or is_standard(user)
