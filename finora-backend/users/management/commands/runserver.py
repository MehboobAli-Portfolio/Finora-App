from django.core.management.commands.runserver import Command as RunserverCommand

class Command(RunserverCommand):
    """
    Custom runserver command that defaults to 0.0.0.0:8000
    so that the mobile app can connect without extra typing.
    """
    default_addr = '0.0.0.0'
    default_port = '8000'
