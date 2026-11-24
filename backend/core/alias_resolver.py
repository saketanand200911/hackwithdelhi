"""
Hinglish & Vernacular Alias-to-HSN Resolver
Maps words like sariya, taar, atta, cement, tel, daal, keel, paint to official HSN & GST slabs.
Supports dynamic alias updates (learning from CA one-tap fixes).
"""

import re
from typing import Dict, Any, Optional, List

DEFAULT_ALIASES = {
    # Construction / Hardware
    "sariya": {"hsn": "7214", "canonical_name": "TMT Steel Bars / Sariya", "official_rate": 18},
    "saria": {"hsn": "7214", "canonical_name": "TMT Steel Bars / Sariya", "official_rate": 18},
    "tmt": {"hsn": "7214", "canonical_name": "TMT Steel Bars", "official_rate": 18},
    "dhalai sariya": {"hsn": "7214", "canonical_name": "TMT Rebars (Dhalai)", "official_rate": 18},
    "taar": {"hsn": "7217", "canonical_name": "Binding Wire / Taar", "official_rate": 18},
    "binding wire": {"hsn": "7217", "canonical_name": "Binding Wire", "official_rate": 18},
    "wire": {"hsn": "7217", "canonical_name": "Iron Wire", "official_rate": 18},
    "cement": {"hsn": "2523", "canonical_name": "Portland Cement", "official_rate": 28},
    "ultratech": {"hsn": "2523", "canonical_name": "Portland Cement (UltraTech)", "official_rate": 28},
    "ambuja": {"hsn": "2523", "canonical_name": "Portland Cement (Ambuja)", "official_rate": 28},
    "acc cement": {"hsn": "2523", "canonical_name": "Portland Cement (ACC)", "official_rate": 28},
    "loha": {"hsn": "7216", "canonical_name": "Iron Angles & Sections", "official_rate": 18},
    "iron angle": {"hsn": "7216", "canonical_name": "Iron Angle / Patti", "official_rate": 18},
    "keel": {"hsn": "7317", "canonical_name": "Nails / Keel", "official_rate": 18},
    "kante": {"hsn": "7317", "canonical_name": "Nails / Keel", "official_rate": 18},
    "nut bolt": {"hsn": "7318", "canonical_name": "Screws, Bolts & Nuts", "official_rate": 18},
    "screw": {"hsn": "7318", "canonical_name": "Screws & Fasteners", "official_rate": 18},
    "paint": {"hsn": "3208", "canonical_name": "Paints & Varnishes", "official_rate": 18},
    "primer": {"hsn": "3208", "canonical_name": "Primer / Enamel", "official_rate": 18},
    "distemper": {"hsn": "3209", "canonical_name": "Distemper / Wall Paint", "official_rate": 18},
    "pvc pipe": {"hsn": "3917", "canonical_name": "PVC Tubes & Pipes", "official_rate": 18},
    "pipe": {"hsn": "3917", "canonical_name": "Pipes & Fittings", "official_rate": 18},
    "plywood": {"hsn": "4412", "canonical_name": "Plywood & Boards", "official_rate": 18},
    "ply": {"hsn": "4412", "canonical_name": "Plywood", "official_rate": 18},

    # Kirana / Grocery
    "atta": {"hsn": "1101", "canonical_name": "Wheat Flour (Atta)", "official_rate": 0},
    "chakki atta": {"hsn": "1101", "canonical_name": "Wheat Flour (Atta)", "official_rate": 0},
    "gehu atta": {"hsn": "1101", "canonical_name": "Wheat Flour", "official_rate": 0},
    "maida": {"hsn": "1101", "canonical_name": "Refined Wheat Flour (Maida)", "official_rate": 0},
    "suji": {"hsn": "1103", "canonical_name": "Semolina / Suji", "official_rate": 0},
    "sooji": {"hsn": "1103", "canonical_name": "Semolina / Suji", "official_rate": 0},
    "chawal": {"hsn": "1006", "canonical_name": "Rice (Chawal)", "official_rate": 0},
    "rice": {"hsn": "1006", "canonical_name": "Rice (Paddy/Husked)", "official_rate": 0},
    "basmati": {"hsn": "1006", "canonical_name": "Basmati Rice", "official_rate": 0},
    "daal": {"hsn": "0713", "canonical_name": "Pulses / Lentils (Daal)", "official_rate": 0},
    "dal": {"hsn": "0713", "canonical_name": "Pulses / Lentils (Dal)", "official_rate": 0},
    "arhar dal": {"hsn": "0713", "canonical_name": "Toor / Arhar Dal", "official_rate": 0},
    "chana dal": {"hsn": "0713", "canonical_name": "Chana Dal", "official_rate": 0},
    "moong dal": {"hsn": "0713", "canonical_name": "Moong Dal", "official_rate": 0},
    "tel": {"hsn": "1514", "canonical_name": "Mustard / Edible Oil", "official_rate": 5},
    "sarson tel": {"hsn": "1514", "canonical_name": "Mustard Oil", "official_rate": 5},
    "refined tel": {"hsn": "1512", "canonical_name": "Refined Sunflower Oil", "official_rate": 5},
    "oil": {"hsn": "1514", "canonical_name": "Edible Cooking Oil", "official_rate": 5},
    "chini": {"hsn": "1701", "canonical_name": "Cane Sugar (Chini)", "official_rate": 5},
    "chinni": {"hsn": "1701", "canonical_name": "Cane Sugar (Chinni)", "official_rate": 5},
    "sugar": {"hsn": "1701", "canonical_name": "Refined Sugar", "official_rate": 5},
    "chai patti": {"hsn": "0902", "canonical_name": "Tea Leaves (Chai)", "official_rate": 5},
    "tea": {"hsn": "0902", "canonical_name": "Black / Green Tea", "official_rate": 5},
    "ghee": {"hsn": "0405", "canonical_name": "Pure Desi Ghee", "official_rate": 12},
    "desi ghee": {"hsn": "0405", "canonical_name": "Desi Ghee", "official_rate": 12},

    # Electrical & Automobile / Workshop
    "led bulb": {"hsn": "8539", "canonical_name": "LED Lamp / Bulb", "official_rate": 18},
    "bulb": {"hsn": "8539", "canonical_name": "Electric Lamp", "official_rate": 18},
    "fan": {"hsn": "8414", "canonical_name": "Ceiling / Table Fan", "official_rate": 18},
    "charger": {"hsn": "8504", "canonical_name": "Mobile / Device Charger", "official_rate": 18},
    "mobil oil": {"hsn": "2710", "canonical_name": "Engine Lubricating Oil", "official_rate": 18},
    "engine oil": {"hsn": "2710", "canonical_name": "Engine Oil (Mobil)", "official_rate": 18},
    "tyre": {"hsn": "4011", "canonical_name": "Rubber Tyres", "official_rate": 28},
    "battery": {"hsn": "8507", "canonical_name": "Lead-Acid Battery", "official_rate": 28}
}

class AliasResolver:
    def __init__(self, custom_alias_file: Optional[str] = None):
        self.aliases: Dict[str, Dict[str, Any]] = dict(DEFAULT_ALIASES)
        self.custom_file = custom_alias_file
        # Future: load persisted custom user aliases if exists

    def resolve_item(self, item_name: str) -> Optional[Dict[str, Any]]:
        if not item_name:
            return None
        clean = re.sub(r"[^\w\s]", " ", item_name.lower()).strip()
        tokens = clean.split()
        
        # 1. Exact phrase match
        if clean in self.aliases:
            return self.aliases[clean]

        # 2. Multi-word sub-phrase matches (e.g. "tata tmt sariya 12mm" -> match "sariya" or "tmt")
        for word in tokens:
            if word in self.aliases:
                return self.aliases[word]

        # 3. Substring matching
        for key, val in self.aliases.items():
            if key in clean or clean in key:
                return val

        return None

    def add_custom_alias(self, alias_term: str, hsn: str, canonical_name: str, official_rate: float):
        clean = alias_term.lower().strip()
        self.aliases[clean] = {
            "hsn": hsn,
            "canonical_name": canonical_name,
            "official_rate": official_rate
        }
        return self.aliases[clean]
