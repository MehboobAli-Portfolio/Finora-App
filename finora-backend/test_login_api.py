import requests

base_url = "http://127.0.0.1:8000/api/auth"

# Register
reg_data = {
    "email": "login_test@example.com",
    "password": "Password123!",
    "password2": "Password123!",
    "username": "login_test",
    "full_name": "Login Test User"
}
print("Registering...")
r = requests.post(f"{base_url}/register/", json=reg_data)
print(r.status_code, r.json())

# Login
login_data = {
    "email": "login_test@example.com",
    "password": "Password123!"
}
print("Logging in...")
l = requests.post(f"{base_url}/login/", json=login_data)
print(l.status_code, l.json())
