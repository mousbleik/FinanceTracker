"""Helpers for creating in-app notifications."""
from django.contrib.auth import get_user_model

from .models import Notification
from .permissions import ADMIN_GROUP


User = get_user_model()


def admin_users(exclude_user=None):
    qs = User.objects.filter(groups__name=ADMIN_GROUP, is_active=True)
    if exclude_user is not None and getattr(exclude_user, 'is_authenticated', False):
        qs = qs.exclude(pk=exclude_user.pk)
    return list(qs.distinct())


def notify(recipients, kind, title, body='', target=None, url='', actor=None):
    """Create a Notification per recipient. Silently no-ops if recipients is empty."""
    if not recipients:
        return
    target_type = type(target).__name__ if target is not None else ''
    target_id = str(target.pk) if target is not None and getattr(target, 'pk', None) else ''
    actor_obj = actor if actor is not None and getattr(actor, 'is_authenticated', False) else None
    Notification.objects.bulk_create([
        Notification(
            recipient=r, actor=actor_obj, kind=kind, title=title, body=body,
            target_type=target_type, target_id=target_id, url=url,
        )
        for r in recipients
    ])
