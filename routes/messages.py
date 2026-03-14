from flask import Blueprint, jsonify, request

from ..models.database import Message, SessionLocal, User


messages_bp = Blueprint("messages", __name__, url_prefix="/api")


@messages_bp.post("/messages/send")
def send_message():
    data = request.get_json() or {}
    sender_id = data.get("sender_id")
    receiver_id = data.get("receiver_id")
    message_text = (data.get("message") or "").strip()

    if not sender_id or not receiver_id or not message_text:
        return jsonify({"success": False, "error": "sender_id, receiver_id, and message are required."}), 400

    db = SessionLocal()
    try:
        sender = db.query(User).get(int(sender_id))
        receiver = db.query(User).get(int(receiver_id))
        if not sender or not receiver:
            return jsonify({"success": False, "error": "Invalid sender or receiver."}), 400

        msg = Message(
            sender_id=sender.id,
            receiver_id=receiver.id,
            message_text=message_text,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        return jsonify({"success": True, "message_id": msg.id})
    finally:
        db.close()


@messages_bp.get("/messages/<int:other_user_id>")
def get_conversation(other_user_id: int):
    """
    Fetch messages between the current user and another user.
    The current user is provided as a query parameter: ?user_id=123
    """
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"success": False, "error": "user_id query parameter is required."}), 400

    db = SessionLocal()
    try:
        # Ensure both users exist
        current = db.query(User).get(user_id)
        other = db.query(User).get(other_user_id)
        if not current or not other:
            return jsonify({"success": False, "error": "User not found."}), 404

        messages = (
            db.query(Message)
            .filter(
                ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id))
                | ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
            )
            .order_by(Message.timestamp.asc())
            .all()
        )

        payload = [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "message_text": m.message_text,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ]

        return jsonify({"success": True, "messages": payload})
    finally:
        db.close()

