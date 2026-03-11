from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

@app.get("/")
def root():
    return {"message": "AztecMatch API is peak"}

class User(BaseModel):
    email: str
    password: str

@app.post("/register")
def register(user: User):
    return {"message": f"User {user.email} is registered!"}

@app.post("/login")
def login(user: User):
    return {"message": f"User {user.email} is logged in!"}