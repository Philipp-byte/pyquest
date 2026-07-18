"""Passwort-Hashing und Login-Schutz fuer die API-Routen."""

from functools import wraps

from flask import jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "not_authenticated"}), 401
        return f(*args, **kwargs)

    return wrapper
