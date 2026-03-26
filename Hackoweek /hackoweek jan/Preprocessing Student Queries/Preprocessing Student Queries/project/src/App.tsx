import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const FAQ_RESPONSES: { [key: string]: { keywords: string[]; response: string } } = {
  timings: {
    keywords: ['timing', 'timings', 'hours', 'schedule', 'open', 'close', 'time'],
    response: 'Our institute is open Monday to Friday from 8:00 AM to 5:00 PM, and Saturday from 9:00 AM to 2:00 PM. We remain closed on Sundays and public holidays.'
  },
  fees: {
    keywords: ['fee', 'fees', 'cost', 'price', 'payment', 'tuition', 'charge'],
    response: 'The fee structure varies by course. Undergraduate programs: ₹60,000 per year, Postgraduate programs: ₹80,000 per year, Diploma courses: ₹40,000 per year. Additional charges may apply for hostel and transportation.'
  },
  contact: {
    keywords: ['contact', 'phone', 'email', 'call', 'reach', 'number', 'mail'],
    response: 'You can reach us at: Phone: +91-9876543210, Email: info@institute.edu.in, Office Phone: 0124-4567890. Our administrative office is available during working hours.'
  },
  courses: {
    keywords: ['course', 'courses', 'program', 'programs', 'degree', 'stream', 'branch'],
    response: 'We offer the following courses: B.Tech (CSE, ECE, Mechanical, Civil), M.Tech (CSE, ECE), MBA, BBA, BCA, MCA, B.Sc (Physics, Chemistry, Mathematics), and various Diploma programs in Engineering and Management.'
  },
  admission: {
    keywords: ['admission', 'admissions', 'apply', 'application', 'enroll', 'enrollment', 'join', 'joining'],
    response: 'Admissions are open twice a year (July and January). Requirements: 10+2 with minimum 60% for undergraduate, Bachelor\'s degree for postgraduate. Apply online at www.institute.edu.in/admissions or visit our campus. Merit-based selection and entrance test applicable.'
  },
  location: {
    keywords: ['location', 'address', 'where', 'situated', 'campus', 'directions', 'map'],
    response: 'Our institute is located at: Sector 45, Knowledge Park, New Delhi - 110025. We are 5 km from the metro station and well-connected by public transport. Campus spans 25 acres with modern facilities.'
  },
  holidays: {
    keywords: ['holiday', 'holidays', 'vacation', 'break', 'closed', 'leave', 'off'],
    response: 'Institute holidays include: National holidays (Republic Day, Independence Day, Gandhi Jayanti), Festival holidays (Diwali, Holi, Eid), Summer break (May-June for 6 weeks), Winter break (December for 2 weeks). Detailed calendar available on our website.'
  },
  hostel: {
    keywords: ['hostel', 'accommodation', 'residence', 'room', 'stay', 'boarding', 'lodge'],
    response: 'Yes, we provide separate hostel facilities for boys and girls with 24/7 security. Hostel fee: ₹50,000 per year including meals. Facilities include Wi-Fi, laundry, recreation room, and medical services. Limited seats available on first-come-first-serve basis.'
  },
  faculty: {
    keywords: ['faculty', 'teacher', 'professor', 'staff', 'instructor', 'lecturer'],
    response: 'Our institute has 150+ highly qualified faculty members. 80% hold PhD degrees from reputed institutions. Faculty-student ratio is 1:15. Many faculty members have industry experience and research publications in international journals.'
  },
  placement: {
    keywords: ['placement', 'placements', 'job', 'recruit', 'career', 'company', 'package'],
    response: 'We have a dedicated Training & Placement Cell. Last year\'s placement record: 85% students placed, Highest package: ₹18 LPA, Average package: ₹6.5 LPA. Top recruiters include TCS, Infosys, Wipro, Amazon, Cognizant, and various startups.'
  },
  library: {
    keywords: ['library', 'book', 'books', 'reading', 'study material'],
    response: 'Our central library houses over 50,000 books, 200+ national and international journals, e-journals, and digital resources. Open from 8:00 AM to 8:00 PM on weekdays. Air-conditioned reading halls with seating capacity of 500 students.'
  },
  sports: {
    keywords: ['sport', 'sports', 'game', 'games', 'gym', 'fitness', 'playground'],
    response: 'We have excellent sports facilities including: Cricket ground, Football field, Basketball courts, Indoor badminton courts, Table tennis, Chess room, and a fully-equipped gymnasium. Annual sports fest is organized every year.'
  },
  transport: {
    keywords: ['transport', 'bus', 'shuttle', 'vehicle', 'travel', 'commute'],
    response: 'Institute provides bus facility covering major areas of the city. 15 bus routes available. Bus fee: ₹12,000 per year. Buses are GPS-tracked with trained drivers. Route details and timings available at the transport office.'
  },
  scholarship: {
    keywords: ['scholarship', 'scholarships', 'financial aid', 'grant', 'concession', 'discount'],
    response: 'Multiple scholarship schemes available: Merit scholarship (up to 50% fee waiver for top performers), Need-based scholarship (for economically weaker sections), Sports scholarship, Government scholarships accepted. Apply during admission process.'
  },
  exam: {
    keywords: ['exam', 'examination', 'test', 'assessment', 'result', 'marks', 'grade'],
    response: 'We follow semester system with mid-term and end-term examinations. Continuous assessment through assignments, projects, and quizzes. Results declared within 30 days of exam. Grading system: O (Outstanding), A+, A, B+, B, C, P (Pass), F (Fail).'
  }
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Hello! Welcome to our institute. I can help you with information about admissions, courses, fees, timings, facilities, and more. How may I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    for (const faq of Object.values(FAQ_RESPONSES)) {
      for (const keyword of faq.keywords) {
        if (lowerMessage.includes(keyword)) {
          return faq.response;
        }
      }
    }

    return "I'm sorry, I can only answer questions related to our institute such as admissions, courses, fees, timings, hostel, placements, location, faculty, library, sports, transport, scholarships, and examinations. Please ask a specific question about any of these topics.";
  };

  const handleSend = () => {
    if (inputValue.trim() === '') return;

    const userMessage: Message = {
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botResponse = findResponse(inputValue);
      const botMessage: Message = {
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Institute Help Desk</h1>
          <p className="text-sm text-blue-100 mt-1">Get answers to your questions about our institute</p>
        </div>

        <div className="h-[500px] overflow-y-auto p-6 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <span>Send</span>
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ask about: Admissions • Courses • Fees • Timings • Hostel • Placements • Location
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
