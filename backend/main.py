# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import users_collection, chat_collection, sessions_collection
from models import UserRegister, UserLogin
from auth import hash_password, verify_password, create_token
from auth import verify_token
from gemini_service import generate_response
from datetime import datetime
from pydantic import BaseModel
import traceback
import asyncio
from bson import ObjectId
import uuid

app = FastAPI()

# More permissive CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class ChatMessage(BaseModel):
    message: str
    session_id: str = None

class SessionTitle(BaseModel):
    title: str

@app.get("/")
def root():
    return {"message": "API is running"}

@app.post("/register")
def register(user: UserRegister):
    try:
        if users_collection.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email already exists")

        hashed = hash_password(user.password)

        users_collection.insert_one({
            "name": user.name,
            "email": user.email,
            "password": hashed
        })

        return {"message": "User registered successfully"}
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
def login(user: UserLogin):
    try:
        db_user = users_collection.find_one({"email": user.email})

        if not db_user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        if not verify_password(user.password, db_user["password"]):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        token = create_token({"id": str(db_user["_id"]), "email": db_user["email"]})

        return {"token": token, "name": db_user["name"]}
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/create")
def create_session(user=Depends(verify_token)):
    try:
        session_id = str(uuid.uuid4())
        session = {
            "session_id": session_id,
            "user_id": user["id"],
            "title": "New Chat",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "message_count": 0
        }
        
        sessions_collection.insert_one(session)
        
        return {
            "session_id": session_id,
            "title": "New Chat",
            "created_at": session["created_at"].isoformat(),
            "updated_at": session["updated_at"].isoformat()
        }
    except Exception as e:
        print(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
def get_sessions(user=Depends(verify_token)):
    try:
        sessions = sessions_collection.find(
            {"user_id": user["id"]}
        ).sort("updated_at", -1)
        
        result = []
        for session in sessions:
            result.append({
                "session_id": session["session_id"],
                "title": session["title"],
                "created_at": session["created_at"].isoformat(),
                "updated_at": session["updated_at"].isoformat(),
                "message_count": session.get("message_count", 0)
            })
        
        return result
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return []

@app.put("/sessions/{session_id}/rename")
def rename_session(session_id: str, session_title: SessionTitle, user=Depends(verify_token)):
    try:
        result = sessions_collection.update_one(
            {"session_id": session_id, "user_id": user["id"]},
            {"$set": {"title": session_title.title, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session renamed successfully"}
    except Exception as e:
        print(f"Error renaming session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, user=Depends(verify_token)):
    try:
        # Delete session
        sessions_collection.delete_one({"session_id": session_id, "user_id": user["id"]})
        
        # Delete all messages in this session
        chat_collection.delete_many({"session_id": session_id, "user_id": user["id"]})
        
        return {"message": "Session deleted successfully"}
    except Exception as e:
        print(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(chat_message: ChatMessage, user=Depends(verify_token)):
    try:
        print(f"Received chat request from user: {user['id']}")
        print(f"Message: {chat_message.message}")
        print(f"Session ID: {chat_message.session_id}")
        
        user_id = user["id"]
        user_message = chat_message.message
        session_id = chat_message.session_id

        # If no session ID, create a new session
        if not session_id:
            session_id = str(uuid.uuid4())
            # Create title from first message
            title = user_message[:50] + "..." if len(user_message) > 50 else user_message
            sessions_collection.insert_one({
                "session_id": session_id,
                "user_id": user_id,
                "title": title,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "message_count": 0
            })

        # Generate AI response with timeout
        try:
            loop = asyncio.get_event_loop()
            ai_response = await asyncio.wait_for(
                loop.run_in_executor(None, generate_response, user_message),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            print("AI response timed out")
            ai_response = "I'm taking too long to respond. Please try again with a shorter question."
        except Exception as e:
            print(f"Error generating AI response: {e}")
            ai_response = "I encountered an error processing your request. Please try again."

        print(f"AI Response length: {len(ai_response)} characters")

        # Save conversation
        try:
            result = chat_collection.insert_one({
                "session_id": session_id,
                "user_id": user_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "timestamp": datetime.utcnow()
            })
            
            # Update session message count and last updated time
            sessions_collection.update_one(
                {"session_id": session_id},
                {
                    "$inc": {"message_count": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            print(f"Saved to database with id: {result.inserted_id}")
        except Exception as e:
            print(f"Error saving to database: {e}")

        return {
            "response": ai_response,
            "session_id": session_id
        }
    except Exception as e:
        print(f"Chat error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.get("/chat_history/{session_id}")
def get_chat_history(session_id: str, user=Depends(verify_token)):
    try:
        user_id = user["id"]
        print(f"Fetching chat history for session: {session_id}")
        
        # Get messages for this session
        history = chat_collection.find(
            {"session_id": session_id, "user_id": user_id}
        ).sort("timestamp", 1)
        
        messages = []
        for msg in history:
            messages.append({
                "sender": "You",
                "text": msg["user_message"]
            })
            messages.append({
                "sender": "AI",
                "text": msg["ai_response"]
            })
        
        print(f"Found {len(messages)} messages")
        return messages
    except Exception as e:
        print(f"History error: {str(e)}")
        return []