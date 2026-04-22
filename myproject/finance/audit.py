"""Audit log helpers."""
from .models import AuditLog


def client_ip(request):
    if request is None:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log(action, user=None, *, request=None, target=None, target_type=None,
        target_id=None, description=''):
    username = ''
    if user is not None and getattr(user, 'is_authenticated', False):
        username = user.username
    elif request is not None and getattr(request, 'user', None) and request.user.is_authenticated:
        user = request.user
        username = user.username

    if target is not None:
        target_type = target_type or target.__class__.__name__
        target_id = target_id or str(getattr(target, 'pk', ''))

    AuditLog.objects.create(
        user=user if user and getattr(user, 'is_authenticated', False) else None,
        username=username,
        action=action,
        target_type=target_type or '',
        target_id=str(target_id) if target_id is not None else '',
        description=(description or '')[:512],
        ip=client_ip(request),
    )
