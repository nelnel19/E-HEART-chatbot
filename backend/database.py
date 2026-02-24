# database.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URL"))
db = client["prulife_chatbot"]

users_collection = db["users"]
chat_collection = db["chats"]
sessions_collection = db["sessions"]  # New collection for chat sessions

# Create indexes for better performance
sessions_collection.create_index([("user_id", 1), ("updated_at", -1)])
chat_collection.create_index([("session_id", 1), ("timestamp", 1)])