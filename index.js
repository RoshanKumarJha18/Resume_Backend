const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ;

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  console.log("Received generation request:", prompt.substring(0, 50) + "...");
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'x-ai/grok-4-fast',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Resume Builder'
        }
      }
    );
    const content = response.data.choices[0].message.content;

    res.json({ content });
  } catch (error) {
    console.error('AI Generate Error:', error.message);
    res.status(500).json({ message: "Error generating content" });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages, currentData } = req.body;

  const systemPrompt = `
    You are an expert AI Resume Builder. Your goal is to interview the user to build a professional resume.
    
    Current Resume Data: ${JSON.stringify(currentData)}
    
    Instructions:
    1. Ask short, clear questions to gather missing information (Name, Contact, Summary, Experience, Education, Skills).
    2. If the user provides information, extract it and update the JSON structure.
    3. Calculate an estimated ATS Score (0-100) based on how complete and professional the resume is so far.
    4. ALWAYS return your response in the following JSON format ONLY:
    {
      "message": "Your conversational response to the user here...",
      "resumeData": {
        "fullName": "...",
        "contact": "...",
        "summary": "...",
        "experience": [{ "role": "...", "company": "...", "duration": "...", "description": "..." }],
        "education": [{ "degree": "...", "school": "...", "year": "..." }],
        "skills": ["..."]
      },
      "atsScore": 50
    }
  `;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'x-ai/grok-4-fast',
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      },
      {
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'Resume Builder' }
      }
    );
    let content = response.data.choices[0].message.content;
    
    // Robust JSON extraction: find the first { and last }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    try {
      const aiContent = JSON.parse(content);
      res.json(aiContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      res.status(500).json({ message: "AI response was not valid JSON. Please try again." });
    }

  } catch (error) {
    console.error('AI Error:', error.message);
    res.status(500).json({ message: `AI Error: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
