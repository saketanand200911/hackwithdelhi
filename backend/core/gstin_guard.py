"""
Deterministic GSTIN Format & Checksum Guard
Validates:
1. 15-character structure & regex
2. Indian State Code (01 to 38, 97, 99)
3. 10-character PAN structure
4. Modulo-36 Checksum (Luhn variant for Indian GSTIN)
"""

import re
from typing import Dict, Any

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
CHAR_MAP = {c: i for i, c in enumerate(CHARS)}

STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction"
}

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

def compute_gstin_checksum(gstin_14: str) -> str:
    """Computes the 15th character checksum for first 14 chars of GSTIN using Modulo 36."""
    s = 0
    for i, char in enumerate(gstin_14.upper()):
        val = CHAR_MAP.get(char, 0)
        # Factor alternates: 1 for odd index (0, 2, 4...) and 2 for even index (1, 3, 5...)
        factor = 1 if (i % 2 == 0) else 2
        product = val * factor
        # Quotient + Remainder of base 36
        s += (product // 36) + (product % 36)
    
    remainder = s % 36
    check_code = (36 - remainder) % 36
    return CHARS[check_code]

def validate_gstin(gstin: str) -> Dict[str, Any]:
    if not gstin:
        return {
            "is_valid": False,
            "gstin": "",
            "state_code": None,
            "state_name": None,
            "pan": None,
            "error_type": "MISSING_GSTIN",
            "message": "Vendor ka GSTIN bill me nahi mila. Bina GSTIN ke ITC claim reject ho sakta hai (100% ITC at risk)."
        }
    
    clean_gstin = re.sub(r"[^A-Za-z0-9]", "", gstin.strip()).upper()

    if len(clean_gstin) != 15:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": clean_gstin[:2] if len(clean_gstin) >= 2 else None,
            "state_name": None,
            "pan": None,
            "error_type": "INVALID_LENGTH",
            "message": f"GSTIN length {len(clean_gstin)} hai, 15 characters hona zaroori hai."
        }

    state_code = clean_gstin[:2]
    if state_code not in STATE_CODES:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": None,
            "pan": clean_gstin[2:12],
            "error_type": "INVALID_STATE_CODE",
            "message": f"State Code '{state_code}' invalid hai. Indian GST state codes 01 se 38 tak hote hain."
        }

    if not GSTIN_REGEX.match(clean_gstin):
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": STATE_CODES.get(state_code),
            "pan": clean_gstin[2:12],
            "error_type": "FORMAT_MISMATCH",
            "message": "GSTIN format galat hai (PAN structure ya 14th character 'Z' missing hai)."
        }

    expected_checksum = compute_gstin_checksum(clean_gstin[:14])
    actual_checksum = clean_gstin[14]
    if expected_checksum != actual_checksum:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": STATE_CODES.get(state_code),
            "pan": clean_gstin[2:12],
            "error_type": "CHECKSUM_FAILED",
            "expected_checksum": expected_checksum,
            "message": f"GSTIN Checksum fail hua. Bill me '{clean_gstin}' hai, sahi checksum digit '{expected_checksum}' hona chahiye (Fake ya typo GSTIN)."
        }

    return {
        "is_valid": True,
        "gstin": clean_gstin,
        "state_code": state_code,
        "state_name": STATE_CODES.get(state_code),
        "pan": clean_gstin[2:12],
        "error_type": None,
        "message": f"Valid GSTIN ({STATE_CODES.get(state_code)})"
    }
