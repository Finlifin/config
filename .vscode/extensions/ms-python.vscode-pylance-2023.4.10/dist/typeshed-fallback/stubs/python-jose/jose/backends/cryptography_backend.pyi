from _typeshed import Incomplete
from typing import Any

from .base import Key

def get_random_bytes(num_bytes: int) -> bytes: ...

# Enable when we can use stubs from installed dependencies:
# from cryptography.hazmat import backends
class CryptographyECKey(Key):
    SHA256: Any
    SHA384: Any
    SHA512: Any
    hash_alg: Any
    cryptography_backend: Any
    prepared_key: Any
    def __init__(self, key, algorithm, cryptography_backend=...) -> None: ...
    def sign(self, msg): ...
    def verify(self, msg, sig): ...
    def is_public(self): ...
    def public_key(self): ...
    def to_pem(self): ...
    def to_dict(self): ...

class CryptographyRSAKey(Key):
    SHA256: Any
    SHA384: Any
    SHA512: Any
    RSA1_5: Any
    RSA_OAEP: Any
    RSA_OAEP_256: Any
    hash_alg: Any
    padding: Any
    cryptography_backend: Any
    prepared_key: Any
    def __init__(self, key, algorithm, cryptography_backend=...) -> None: ...
    def sign(self, msg): ...
    def verify(self, msg, sig): ...
    def is_public(self): ...
    def public_key(self): ...
    def to_pem(self, pem_format: str = ...): ...
    def to_dict(self): ...
    def wrap_key(self, key_data): ...
    def unwrap_key(self, wrapped_key): ...

class CryptographyAESKey(Key):
    KEY_128: Any
    KEY_192: Any
    KEY_256: Any
    KEY_384: Any
    KEY_512: Any
    AES_KW_ALGS: Any
    MODES: Any
    def __init__(self, key, algorithm) -> None: ...
    def to_dict(self): ...
    def encrypt(self, plain_text, aad: Incomplete | None = ...): ...
    def decrypt(self, cipher_text, iv: Incomplete | None = ..., aad: Incomplete | None = ..., tag: Incomplete | None = ...): ...
    def wrap_key(self, key_data): ...
    def unwrap_key(self, wrapped_key): ...

class CryptographyHMACKey(Key):
    ALG_MAP: Any
    prepared_key: Any
    def __init__(self, key, algorithm) -> None: ...
    def to_dict(self): ...
    def sign(self, msg): ...
    def verify(self, msg, sig): ...
