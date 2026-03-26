# Educational Institute FAQ Chatbot

## Project Overview
This is a **rule-based chatbot** designed for educational institutes to answer frequently asked questions. It uses **keyword matching** and **conditional logic** - **NO AI or machine learning** is involved.

## Technology Stack
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for development and building
- Pure JavaScript logic (no AI/NLP libraries)

## Chatbot Logic - Rule-Based Approach

### How It Works
The chatbot uses a simple **keyword matching algorithm**:

1. User types a question
2. System converts input to lowercase (case-insensitive matching)
3. System searches for matching keywords in predefined FAQ database
4. If keyword found → returns corresponding answer
5. If no keyword matches → returns default "cannot answer" message

### Code Structure

```typescript
// Each FAQ has keywords and a fixed response
const FAQ_RESPONSES = {
  timings: {
    keywords: ['timing', 'timings', 'hours', 'schedule', 'open', 'close', 'time'],
    response: 'Our institute is open Monday to Friday...'
  },
  // ... more FAQs
}

// Matching logic - simple keyword search
function findResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  for (const faq of Object.values(FAQ_RESPONSES)) {
    for (const keyword of faq.keywords) {
      if (lowerMessage.includes(keyword)) {
        return faq.response;
      }
    }
  }

  return "I'm sorry, I can only answer institute-related questions...";
}
```

## Supported FAQs (15 Topics)

1. **Institute Timings** - Keywords: timing, hours, schedule, open, close
2. **Fee Structure** - Keywords: fee, cost, price, payment, tuition
3. **Contact Details** - Keywords: contact, phone, email, call, reach
4. **Courses Offered** - Keywords: course, program, degree, stream, branch
5. **Admission Process** - Keywords: admission, apply, application, enroll, join
6. **Location/Address** - Keywords: location, address, where, campus, directions
7. **Holidays/Breaks** - Keywords: holiday, vacation, break, closed, leave
8. **Hostel Facilities** - Keywords: hostel, accommodation, residence, room, stay
9. **Faculty Information** - Keywords: faculty, teacher, professor, staff, instructor
10. **Placement Details** - Keywords: placement, job, recruit, career, company, package
11. **Library Facilities** - Keywords: library, book, reading, study material
12. **Sports Facilities** - Keywords: sport, game, gym, fitness, playground
13. **Transport Services** - Keywords: transport, bus, shuttle, vehicle, commute
14. **Scholarships** - Keywords: scholarship, financial aid, grant, concession
15. **Examinations** - Keywords: exam, examination, test, assessment, result, marks

## Features

### User Interface
- Clean, professional design (college website style)
- Chat window with message history
- User input box with Enter key support
- Send button for message submission
- Timestamps for each message
- Scrollable chat area
- Responsive design

### Functional Features
- **Case-insensitive matching**: "FEES" and "fees" both work
- **Multiple keyword variations**: Handles different ways to ask same question
- **Instant responses**: No API calls, all responses are predefined
- **Error handling**: Unknown questions get helpful fallback message
- **Clean UX**: Simple, intuitive interface

## Example Conversations

**User:** What are your timings?
**Bot:** Our institute is open Monday to Friday from 8:00 AM to 5:00 PM...

**User:** How much is the fee?
**Bot:** The fee structure varies by course. Undergraduate programs: ₹60,000...

**User:** Tell me about placements
**Bot:** We have a dedicated Training & Placement Cell. Last year's placement record...

**User:** What is the weather today?
**Bot:** I'm sorry, I can only answer questions related to our institute...

## Why This is NOT AI-Based

1. **No machine learning models** - No training data, no neural networks
2. **No NLP libraries** - No natural language processing APIs
3. **Predefined responses** - All answers are hardcoded
4. **Simple pattern matching** - Uses basic string searching with `includes()`
5. **Deterministic** - Same question always returns same answer
6. **No learning capability** - Chatbot doesn't learn from conversations

## How to Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── App.tsx          # Main chatbot component
├── main.tsx         # React entry point
└── index.css        # Tailwind CSS imports
```

## Customization Guide

### Adding New FAQs

1. Open `src/App.tsx`
2. Add new entry to `FAQ_RESPONSES` object:

```typescript
newTopic: {
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  response: 'Your detailed answer here...'
}
```

### Changing Responses

Simply edit the `response` field for any FAQ in the `FAQ_RESPONSES` object.

### Modifying UI Colors

Change the Tailwind classes in the return statement:
- Header: `bg-blue-600` → change to any color
- User messages: `bg-blue-600` → change bubble color
- Bot messages: `bg-white border border-gray-200` → customize

## Academic Project Notes

This project demonstrates:
- ✅ Rule-based chatbot logic
- ✅ Keyword/pattern matching approach
- ✅ Conditional statements (if-else logic)
- ✅ Array/object data structures
- ✅ Event handling in web applications
- ✅ DOM manipulation with React
- ✅ State management
- ✅ Clean, professional UI/UX design

**No AI, machine learning, or NLP used** - Perfect for academic submissions requiring traditional programming approaches.
