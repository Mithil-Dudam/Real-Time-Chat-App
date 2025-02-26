from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Annotated

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker

from sqlalchemy import Column, Integer, String, ForeignKey

from sqlalchemy.orm import Session,declarative_base

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

URL_db = 'postgresql://postgres:password@localhost:5432/ChatApp' 

engine = create_engine(URL_db)
sessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()

class Users(Base):
    __tablename__ = 'Users'
    id = Column(Integer,primary_key=True,index=True)
    email = Column(String,index=True)
    password = Column(String,index=True)
    username = Column(String,index=True)

class Chats(Base):
    __tablename__ = 'Chats'
    id = Column(Integer,primary_key=True,index=True)
    user1 = Column(Integer,ForeignKey("Users.id"),index=True)
    user2 = Column(Integer,ForeignKey("Users.id"),index=True)
    
class Texts(Base):
    __tablename__ = 'Texts'
    id = Column(Integer,primary_key=True,index=True)
    chat_id = Column(Integer,ForeignKey("Chats.id"),index=True)
    text = Column(String,index=True)
    sent_by = Column(Integer,ForeignKey("Users.id"),index=True)


class UserInfo(BaseModel):
    email:str
    password:str
    username:str

class Login(BaseModel):
    email:str
    password:str

class TextSent(BaseModel):
    text:str

Base.metadata.create_all(bind=engine)

def get_db():
    db=sessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency=Annotated[Session,Depends(get_db)]

@app.post("/new-user",status_code=status.HTTP_201_CREATED)
async def new_user(user:UserInfo,db:db_dependency):
    user_exits = db.query(Users).filter(Users.email==user.email).first()
    if user_exits:
        raise HTTPException(status_code=302,detail="Email already exits")
    db_user = Users(email=user.email.strip(),password=user.password.strip(),username=user.username.strip())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message":"User Created Successfully"}

@app.post("/login",status_code=status.HTTP_200_OK)
async def login(user:Login,db:db_dependency):
    user_exits = db.query(Users).filter(Users.email==user.email.strip(),Users.password==user.password.strip()).first()
    if user_exits:
        return {"message":"Log In Successful","id":user_exits.id}
    raise HTTPException(status_code=404,detail="Invalid Username or Password!")

@app.get("/users",status_code=status.HTTP_200_OK)
async def users(user_id:int,db:db_dependency):
    users = db.query(Users).filter(Users.id!=user_id).all()
    return [{"username":user.username,"user_id":user.id} for user in users]

@app.post("/chat",status_code=status.HTTP_201_CREATED)
async def chat(id:int,recipient:int,db:db_dependency):
    chat_exits = db.query(Chats).filter(or_((Chats.user1==id)&(Chats.user2==recipient), (Chats.user1==recipient)&(Chats.user2==id))).first()
    if chat_exits:
        return {"chat_id":chat_exits.id}
    else:
        chat = Chats(user1=id,user2=recipient)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return {"chat_id":chat.id}

@app.post("/text",status_code=status.HTTP_201_CREATED)
async def chat(chat_id:int,text:TextSent,sent_by:int,db:db_dependency):
    chat = Texts(chat_id=chat_id,text=text.text,sent_by=sent_by)
    db.add(chat)
    db.commit()
    db.refresh(chat)

@app.get("/texts",status_code=status.HTTP_200_OK)
async def texts(chat_id:int,db:db_dependency):
    texts = db.query(Texts).filter(Texts.chat_id==chat_id).all()
    return [{"text":text.text,"sent_by":text.sent_by} for text in texts]

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}  # Mapping chat_id -> list of WebSockets
    
    async def connect(self, websocket: WebSocket, chat_id: int):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: int):
        if chat_id in self.active_connections:
            self.active_connections[chat_id].remove(websocket)
            if not self.active_connections[chat_id]:  # Remove empty chat_id list
                del self.active_connections[chat_id]

    async def send_to_chat(self, chat_id: int, message: str):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: int):
    await manager.connect(websocket, chat_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_to_chat(chat_id, data)  # Send only to users in the same chat
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)




