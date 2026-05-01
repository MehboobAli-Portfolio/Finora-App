import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.apps import apps

print("--- Deep Database Audit ---")
for model in apps.get_models():
    try:
        count = model.objects.count()
        if count > 0:
            print(f"[{model.__module__}.{model.__name__}] Count: {count}")
            # Try to print some fields
            for obj in model.objects.all()[:5]:
                try:
                    # Print identifying info
                    info = []
                    if hasattr(obj, 'email'): info.append(f"email={obj.email}")
                    if hasattr(obj, 'name'): info.append(f"name={obj.name}")
                    if hasattr(obj, 'description'): info.append(f"desc={obj.description}")
                    if hasattr(obj, 'amount'): info.append(f"amount={obj.amount}")
                    if hasattr(obj, 'txn_type'): info.append(f"type={obj.txn_type}")
                    if hasattr(obj, 'user'): info.append(f"user={obj.user.email if hasattr(obj.user, 'email') else obj.user}")
                    
                    print(f"  - ID: {obj.pk} | {' '.join(info)}")
                except:
                    print(f"  - ID: {obj.pk} (could not print details)")
    except Exception as e:
        pass
