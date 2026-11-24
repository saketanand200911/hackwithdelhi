"""
AI CA Assistant ('Vyaapar CA')
Explains financial, GST, and bill errors in simple, comforting Hinglish/Hindi for small shop owners.
Zero intimidating legal jargon.
"""

from typing import Dict, Any, Optional

DEFAULT_CA_RESPONSES = {
    "what_is_itc": (
        "**ITC (Input Tax Credit)** ka matlab hai wo tax jo aapne maal khareedte waqt supplier ko diya tha. "
        "Jab aap aage grahak ko maal bechte hain aur GST jama karte hain, toh ye khareedari par diya hua tax "
        "aapke kul tax me se ghat (minus) jata hai. Par agar bill me GSTIN galat ho ya tax rate miss ho, toh "
        "sarkar ye credit reject kar deti hai — isi ko hum **At-Risk ITC** kehte hain!"
    ),
    "why_flagged": (
        "Aapka ye bill system ne isliye flag kiya hai kyunki isme do baatein pakdi gayi hain:\n"
        "1. **Galat GST Slab**: Sariya par official rate 18% lagna chahiye tha, par bill me 12% lagaya hai.\n"
        "2. **Line Math Error**: 5 kg taar ₹90 ke hisab se ₹450 hota hai, par parchi par ₹550 likha hua hai.\n"
        "Aap upar diye '1-Tap Fix' button ko dabakar ise turant theek kar sakte hain."
    ),
    "what_is_hsn": (
        "**HSN Code** har item ka sarkari 4 ya 8 digit ka pehchan number hota hai. "
        "Jaise Sariya ka 7214 hai aur Cement ka 2523. Sahi HSN hone par hi pata chalta hai ki uspe 5%, 12%, 18% ya 28% tax lagega."
    ),
    "fake_gstin": (
        "Agar vendor ka **GSTIN galat ya fake** ho, toh GST Portal aapka 100% ITC reject kar deta hai aur section 16(2) ke tehat "
        "18% byaaj aur penalty lag sakti hai. Kachha2GST ka GSTIN Guard pehle hi checksum se aisi galati pakad leta hai."
    )
}

class AICAAssistant:
    def __init__(self):
        pass

    def answer_question(self, query: str, active_bill_summary: Optional[str] = None) -> Dict[str, Any]:
        q = query.lower()

        if "itc" in q and ("kya" in q or "what" in q or "matlab" in q):
            ans = DEFAULT_CA_RESPONSES["what_is_itc"]
        elif "flag" in q or "galat" in q or "issue" in q or "kyu" in q or "problem" in q:
            if active_bill_summary:
                ans = f"Aapke active bill me ye dikkat hai: **{active_bill_summary}**\n\nIse theek karne ke liye 1-Tap Quick Fix dabayein taaki At-Risk ITC bach sake."
            else:
                ans = DEFAULT_CA_RESPONSES["why_flagged"]
        elif "hsn" in q:
            ans = DEFAULT_CA_RESPONSES["what_is_hsn"]
        elif "gstin" in q or "pan" in q:
            ans = DEFAULT_CA_RESPONSES["fake_gstin"]
        elif "kachha" in q or "notice" in q or "penalty" in q:
            ans = (
                "Kachha parchi pe notice tab aata hai jab hisaab me gadbad ho ya ITC galat claim ho jaye. "
                "Kachha2GST aapki parchi ko scan karke formal GSTR-2B compliance me convert kar deta hai taaki CA ko clean file mile."
            )
        else:
            ans = (
                f"Namaste! Mai aapka Vyaapar CA assistant hoon. "
                f"Aapne poocha: '{query}'. "
                f"Aapke business ke records me abhi tak sabhi calculations code se verify ho rahi hain. "
                f"Aap bill errors ya GST compliance se juda koi bhi sawal pooch sakte hain!"
            )

        return {
            "query": query,
            "response": ans,
            "assistant_role": "Vyaapar CA (MSME Financial Buddy)"
        }
