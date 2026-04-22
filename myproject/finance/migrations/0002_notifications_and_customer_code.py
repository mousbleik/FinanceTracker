from django.conf import settings
from django.db import migrations, models


def backfill_customer_codes(apps, schema_editor):
    Customer = apps.get_model('finance', 'Customer')
    for c in Customer.objects.all().order_by('pk'):
        if not c.code:
            c.code = f'CUST-{c.pk:05d}'
            c.save(update_fields=['code'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='code',
            field=models.CharField(blank=True, db_index=True, max_length=32),
        ),
        migrations.RunPython(backfill_customer_codes, noop_reverse),
        migrations.AlterField(
            model_name='customer',
            name='code',
            field=models.CharField(blank=True, db_index=True, max_length=32, unique=True),
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[
                    ('order_created', 'Order created'),
                    ('expense_created', 'Expense created'),
                    ('payment_created', 'Payment created'),
                    ('asset_created', 'Asset created'),
                    ('liability_created', 'Liability created'),
                    ('customer_created', 'Customer created'),
                    ('vendor_created', 'Vendor created'),
                    ('task_assigned', 'Task assigned'),
                    ('task_status_changed', 'Task status changed'),
                    ('task_commented', 'Task commented'),
                    ('import_completed', 'Import completed'),
                    ('broadcast_sent', 'Broadcast sent'),
                ], max_length=32)),
                ('title', models.CharField(max_length=200)),
                ('body', models.TextField(blank=True)),
                ('target_type', models.CharField(blank=True, max_length=64)),
                ('target_id', models.CharField(blank=True, max_length=64)),
                ('url', models.CharField(blank=True, max_length=256)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('recipient', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['recipient', '-created_at'], name='finance_not_recipie_e23bfd_idx'),
                    models.Index(fields=['recipient', 'read_at'], name='finance_not_recipie_b9d051_idx'),
                ],
            },
        ),
    ]
