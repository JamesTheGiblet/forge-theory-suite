console.log("GEMINI_API_KEY from env:", process.env.GEMINI_API_KEY ? "present" : "missing");
if (process.env.GEMINI_API_KEY) {
    console.log("Key starts with:", process.env.GEMINI_API_KEY.slice(0,10));
}
