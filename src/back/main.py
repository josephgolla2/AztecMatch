from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS so the front-end can fetch
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    
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


# =============
# PROFILE MODEL
# =============
class Profile(BaseModel):
    name: str
    age: int
    gender: str
    bio: str
    interests: str
    photo: str 

# In-memory storage for profiles
profiles: List[Profile] = []

@app.post("/profile")
def create_profile(profile: Profile):
    return {
        "message": f"Profile for {profile.name} created!",
        "profile": profile
    }

@app.get("/profile")
def get_profiles():
    return {"profiles": profiles}
