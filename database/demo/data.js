// Demo content for the public Teachers / Job-board pages. Everything here is
// inserted into MySQL by database/seed_demo.js — the pages themselves contain
// no hard-coded teachers or jobs any more.
const GCS = 'https://storage.googleapis.com/yogkulam/landing-page/teacher/';

// ---------------------------------------------------------------- reference
exports.states = [
  ['India', 'Rajasthan'],
];

exports.cities = [
  // [state, city]  — 'New Delhi' is renamed to 'Delhi' (the name the site uses)
  ['Rajasthan', 'Jaipur'],
];

exports.localities = {
  Lucknow: ['Gomti Nagar', 'Kamta', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Alambagh'],
  Delhi: ['Saket', 'Dwarka', 'Hauz Khas', 'Lajpat Nagar', 'Vasant Kunj'],
  Mumbai: ['Andheri', 'Bandra', 'Powai', 'Juhu'],
  Pune: ['Koregaon Park', 'Kothrud', 'Baner'],
  Bengaluru: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout'],
  Gurugram: ['Golf Course Road', 'DLF Phase 3', 'Sohna Road'],
  Jaipur: ['Vaishali Nagar', 'Malviya Nagar', 'C-Scheme'],
  Kanpur: ['Swaroop Nagar', 'Kakadeo'],
};

// name, slug, short label used on chips/tags, SEO description
exports.styles = [
  ['Hatha Yoga', 'hatha-yoga', 'Hatha', 'Classical, slow-paced postures held with steady breathing — the best starting point for beginners and anyone rebuilding flexibility.'],
  ['Ashtanga / Power', 'ashtanga-power-yoga', 'Ashtanga', 'A dynamic, strength-building sequence linking breath and movement, taught progressively by trained Ashtanga and power-yoga teachers.'],
  ['Prenatal Yoga', 'prenatal-yoga', 'Prenatal', 'Trimester-aware yoga for pregnancy — gentle strength, breath work and relief from back and hip discomfort.'],
  ['Therapeutic Yoga', 'therapeutic-yoga', 'Therapeutic', 'Yoga adapted to back pain, injuries and chronic conditions, taught by teachers trained in yoga therapy.'],
  ['Meditation', 'meditation', 'Meditation', 'Guided meditation and mindfulness practice for stress, sleep and focus.'],
  ['Yoga of Education', 'yoga-of-education', 'Education', 'Yoga for students and schools — focus, posture and exam-season stress relief.'],
  ['Corporate Wellness', 'corporate-wellness', 'Corporate', 'Desk yoga and stress-relief sessions for teams, offices and workplaces.'],
  ['Yoga for Seniors', 'yoga-for-seniors', 'Seniors', 'Gentle, chair-supported and joint-friendly yoga for older adults.'],
  ['Vinyasa Yoga', 'vinyasa-yoga', 'Vinyasa', 'Flowing sequences that link breath to movement, from beginner flows to power classes.'],
  ['Pranayama', 'pranayama', 'Pranayama', 'Breath-control practice for energy, calm and lung capacity.'],
  ['Yoga for Weight Loss', 'yoga-for-weight-loss', 'Weight Loss', 'Calorie-burning flows, core work and lifestyle guidance for healthy, sustainable weight loss.'],
  ['Yoga for Kids', 'yoga-for-kids', 'Kids', 'Playful, age-appropriate yoga that builds focus, balance and confidence in children.'],
];

// ---------------------------------------------------------------- teachers
// avail: 7 entries Mon..Sun, each [morning, evening]; O = open, T = booked, - = no slot
// dist:  share of 5/4/3/2/1-star reviews
exports.teachers = [
  {
    key: 'shikhar', adoptUserId: 7,
    name: 'Shikhar Mehrotra', slug: 'shikhar-mehrotra', gender: 'male',
    city: 'Lucknow', locality: 'Gomti Nagar', pincode: '226010',
    photo: GCS + 'Shikhar-Mehrotra.jpg',
    styles: ['Hatha Yoga', 'Ashtanga / Power'], headline: 'Hatha & Ashtanga',
    focus: ['Hatha', 'Ashtanga', 'Beginners'], languages: ['English', 'Hindi'],
    years: 8, mode: 'offline', price: 600, trial: 0, team: 5.0,
    tagline: 'Hatha & Ashtanga teacher with 8 years of experience across Lucknow. Structured, patient classes for beginners and intermediate practitioners — credentials verified directly with the issuing body.',
    bio: 'Certified Hatha and Ashtanga teacher trained through Yoga Alliance, with 8 years of teaching in Lucknow — from morning studio batches to one-to-one home sessions.\n\nMy classes are built around progression, not performance: clear cues, sensible modifications and a pace that respects joints and beginners alike. Students usually notice better flexibility and posture within a few weeks.',
    qualifications: '200-Hour Yoga Teacher Training (Yoga Alliance); Ashtanga Foundations (PYC)',
    certs: [
      ['200-Hour Yoga Teacher Training', 'Yoga Alliance', 'YS-03110', 'RYT 200'],
      ['Ashtanga Vinyasa Foundations', 'PYC', 'YS-03111', null],
    ],
    formats: { offline: ['Private session', 600, "In-person at Shikhar's Gomti Nagar studio — mats and props included.", true] },
    packages: [[10, 5400]],
    reviews: 128, acceptance: 0.97, responseHours: 14, monthly: 24, dist: [88, 9, 2, 1, 0],
    avail: [['O', 'O'], ['O', 'O'], ['O', 'T'], ['O', 'O'], ['O', 'O'], ['O', '-'], ['O', '-']],
    quote: ['Patient and structured — my flexibility improved within weeks.', 'Neha Rao'],
    texts: [
      ['Kavita Sharma', 5, 'Clear cues and a pace that actually suits beginners. Highly recommended.'],
      ['Arjun Mehta', 5, 'Strong Ashtanga foundation without ever feeling rushed.'],
      ['Meera Iyer', 4, 'Great teacher. Morning slots fill up quickly, so book early.'],
      ['Rahul Verma', 5, 'My back stiffness reduced noticeably after two months.'],
      ['Sana Khan', 5, 'Calm, disciplined and genuinely knowledgeable.'],
    ],
    comments: [
      ['Aditi S.', 'Does he take evening batches on weekdays too?', 5],
      ['Rohan T.', 'Joined last month, easily the best Hatha teacher in Gomti Nagar.', 26],
      ['Pooja M.', 'Great for complete beginners — very patient.', 72],
    ],
    qa: [
      ['Do you teach complete beginners?', 'Yes — a large part of my students start with zero experience. We begin with foundational Hatha and progress into Ashtanga sequences only when your body is ready.'],
      ['Is there a trial class?', 'The first connection on YogSetu is free, so we can talk through your goals and schedule before you commit to a session.'],
    ],
  },
  {
    key: 'shachi',
    name: 'Shachi Khemuka', slug: 'shachi-khemuka', gender: 'female',
    city: 'Bengaluru', locality: 'Indiranagar', pincode: '560038',
    photo: GCS + 'Shachi-Khemuka.jpg',
    styles: ['Hatha Yoga', 'Therapeutic Yoga'], headline: 'Hatha & Yoga Therapy',
    focus: ['Hatha', 'Therapeutic'], languages: ['English', 'Hindi', 'Kannada'],
    years: 12, mode: 'hybrid', price: 1100, trial: null, team: 5.0,
    tagline: 'Hatha and yoga-therapy teacher with 12 years of experience in Bengaluru and online, specialising in back, neck and posture problems. Credentials verified directly with the issuing body.',
    bio: 'I trained in classical Hatha and later specialised in yoga therapy, working alongside physiotherapists to help students with chronic back, neck and shoulder pain.\n\nEvery programme starts with a short assessment, then a small set of practices you can repeat at home. Sessions are one-to-one or in very small groups.',
    qualifications: 'Diploma in Yoga Science (AYUSH-recognised); Yoga Therapy Foundations (PYC)',
    certs: [
      ['Diploma in Yoga Science', 'AYUSH', 'YS-02207', 'Diploma in Yoga Science'],
      ['Yoga Therapy Foundations', 'PYC', 'YS-02208', null],
    ],
    formats: { online: ['Private session', 1000, 'One-on-one over video call with a follow-up practice sheet.', false], offline: ['Private session', 1100, "In-person at Shachi's Indiranagar studio.", true] },
    packages: [[8, 7900]],
    reviews: 62, acceptance: 0.95, responseHours: 20, monthly: 19, dist: [98, 2, 0, 0, 0],
    avail: [['T', 'T'], ['T', 'O'], ['T', 'T'], ['O', 'T'], ['T', 'T'], ['-', '-'], ['-', '-']],
    quote: ['Helped with my chronic back pain more than physio did.', 'Rohit Khanna'],
    texts: [
      ['Nandini Rao', 5, 'Finally someone who explains why each movement matters for my back.'],
      ['Karan Malhotra', 5, 'My neck pain from desk work is mostly gone. Worth every session.'],
      ['Divya Pillai', 5, 'Thoughtful, unhurried and very professional.'],
    ],
    comments: [
      ['Sneha K.', 'Does she work with disc-related issues?', 8],
      ['Manoj R.', 'Been seeing Shachi for 3 months. Life-changing for my posture.', 60],
    ],
    qa: [
      ['Can you work alongside my physiotherapist?', 'Absolutely. I often coordinate with physiotherapists so that the practices complement your treatment plan rather than compete with it.'],
    ],
  },
  {
    key: 'vikas',
    name: 'Vikas Singh Rajput', slug: 'vikas-singh-rajput', gender: 'male',
    city: 'Mumbai', locality: 'Andheri', pincode: '400053',
    photo: GCS + 'VIkas-Singh-Rajput.jpg',
    styles: ['Ashtanga / Power', 'Pranayama'], headline: 'Ashtanga & Pranayama',
    focus: ['Ashtanga', 'Pranayama'], languages: ['English', 'Hindi', 'Marathi'],
    years: 10, mode: 'offline', price: 900, trial: null, team: 5.0,
    tagline: 'Ashtanga and pranayama teacher with 10 years of experience in Mumbai. Strength, stamina and breath control — taught progressively and safely. Credentials verified directly with the issuing body.',
    bio: 'A decade of teaching Ashtanga and pranayama in Mumbai — from early-morning Mysore-style practice to breath-focused sessions for busy professionals.\n\nIt is intense but structured: you learn the sequence, the breath and the reasoning behind each transition, so the practice keeps working for you long after class.',
    qualifications: '500-Hour Yoga Teacher Training (Yoga Alliance); Pranayama Instructor Course (YTTAI)',
    certs: [
      ['500-Hour Yoga Teacher Training', 'Yoga Alliance', 'YS-05310', 'RYT 500'],
      ['Pranayama Instructor Course', 'YTTAI', 'YS-05311', null],
    ],
    formats: { offline: ['Private session', 900, "In-person at Vikas's Andheri studio.", true] },
    packages: [[12, 9600]],
    reviews: 156, acceptance: 0.96, responseHours: 12, monthly: 31, dist: [88, 9, 2, 1, 0],
    avail: [['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', 'T'], ['O', 'O'], ['O', '-'], ['O', '-']],
    quote: ['Intense but exactly what I needed to build real strength.', 'Arjun Mehta'],
    texts: [
      ['Rahul Verma', 5, 'The best Ashtanga teacher in Andheri. Structured and safe.'],
      ['Sana Khan', 5, 'Pranayama sessions changed how I handle stress at work.'],
      ['Tarun Bhatia', 4, 'Demanding but rewarding. Not for the faint-hearted!'],
      ['Ishita Joshi', 5, 'I feel stronger and calmer after six months.'],
    ],
    comments: [
      ['Yash P.', 'Do you run a beginners Ashtanga batch?', 12],
      ['Ritika D.', 'Started pranayama with Vikas last week — already feeling the difference.', 90],
    ],
    qa: [
      ['I have no yoga experience. Is Ashtanga too much?', 'You will start with a shortened, modified sequence. We add poses only as your strength and breath allow — nobody is thrown into the full series.'],
    ],
  },
  {
    key: 'amrita',
    name: 'Amrita Gupta', slug: 'amrita-gupta', gender: 'female',
    city: 'Delhi', locality: 'Saket', pincode: '110017',
    photo: GCS + 'Amrita-Gupta.jpg',
    styles: ['Prenatal Yoga', 'Therapeutic Yoga'], headline: 'Prenatal & Therapeutic',
    focus: ['Prenatal', 'Therapeutic'], languages: ['English', 'Hindi'],
    years: 7, mode: 'hybrid', price: 750, trial: 0, team: 5.0,
    tagline: 'Prenatal & therapeutic yoga teacher with 7 years of experience across Delhi and online. Classes are kept small and built around where your body actually is — not a fixed studio sequence. Credentials verified directly with the issuing body.',
    bio: "Certified prenatal & therapeutic specialist, trained through Yoga Alliance and YTTAI, with 7 years of teaching across Delhi and online.\n\nMy goal with every student is the same: leave the session feeling like it was actually built for where you are that day — not adapted from someone else's plan.",
    qualifications: '200-Hour YTT (Yoga Alliance); Prenatal Yoga Certification (YTTAI); Yoga Therapy Foundations (PYC)',
    certs: [
      ['200-Hour Yoga Teacher Training', 'Yoga Alliance', 'YS-04821', 'RYT 200'],
      ['Prenatal Yoga Certification', 'YTTAI', 'YS-04822', null],
      ['Yoga Therapy Foundations', 'PYC', 'YS-04823', null],
    ],
    formats: {
      online: ['Private session', 750, 'One-on-one over video call, scheduled around your trimester and energy that week.', false],
      offline: ['Private session', 899, "In-person at Amrita's Delhi studio — most booked format, includes props and mat.", true],
    },
    packages: [[8, 6400]],
    reviews: 94, acceptance: 0.96, responseHours: 24, monthly: 16, dist: [82, 13, 3, 1, 1],
    avail: [['T', 'T'], ['O', 'O'], ['T', 'O'], ['O', 'O'], ['O', 'T'], ['O', '-'], ['-', '-']],
    quote: ['Made me feel safe through my whole pregnancy journey. Would recommend to anyone in their third trimester especially.', 'Kavita Sharma'],
    texts: [
      ['Priya Nair', 5, 'Calm, patient, and actually explains the “why” behind each pose. Highly recommend for beginners.'],
      ['Meera Iyer', 5, 'Booked a prenatal trial class and stayed for the full term. Genuinely knows the subject.'],
      ['Ananya Kapoor', 5, "Switched from a studio class to 1:1 with Amrita and the difference in how sessions are paced is huge."],
    ],
    comments: [
      ['Neha R.', 'Just booked my first session after reading through this page — excited!', 2],
      ['Priya D.', 'Does she teach postpartum too, or only during pregnancy?', 24],
      ['Kavita S.', 'Been coming here every week for two months — genuinely the calmest hour of my week.', 72],
      ['Ananya', 'Recommended her to two friends already. Worth every rupee.', 168],
    ],
    qa: [
      ['Do you bring props, or do we need our own mat and blocks?', "I provide mats, blocks and a bolster for in-studio sessions — you don't need to bring anything. For online sessions, a mat and one or two firm cushions work fine."],
      ['Can I switch between online and in-studio week to week?', 'Yes — the 8-session pack works across both formats, so you can mix based on your week. Just mention your preference for each session when you book.'],
    ],
  },
  {
    key: 'shamli',
    name: 'Shamli Joshi', slug: 'shamli-joshi', gender: 'female',
    city: 'Pune', locality: 'Koregaon Park', pincode: '411001',
    photo: GCS + 'Shamli-Joshi.jpg',
    styles: ['Meditation', 'Vinyasa Yoga'], headline: 'Vinyasa & Meditation',
    focus: ['Vinyasa', 'Meditation'], languages: ['English', 'Hindi', 'Marathi'],
    years: 4, mode: 'online', price: 550, trial: 0, team: 4.8,
    tagline: 'Vinyasa and meditation teacher with 4 years of experience, teaching live online classes from Pune. Gentle flows and guided stillness for busy weeks. Credentials verified directly with the issuing body.',
    bio: 'I teach live, online Vinyasa flows and guided meditation for people who want a calm, dependable practice inside a busy schedule.\n\nExpect small groups, clear voice-led guidance and a practice you can do in a small space with just a mat.',
    qualifications: '200-Hour Yoga Teacher Training (YTTAI); Mindfulness Meditation Facilitator',
    certs: [
      ['200-Hour Yoga Teacher Training', 'YTTAI', 'YS-06412', 'RYT 200'],
      ['Mindfulness Meditation Facilitator', 'YTTAI', 'YS-06413', null],
    ],
    formats: { online: ['Private session', 550, 'One-on-one live over video call, any time that suits your day.', true] },
    packages: [[10, 4800]],
    reviews: 71, acceptance: 0.94, responseHours: 18, monthly: 13, dist: [75, 20, 4, 1, 0],
    avail: [['O', 'T'], ['-', 'O'], ['T', 'O'], ['-', 'O'], ['-', 'T'], ['O', '-'], ['-', '-']],
    quote: ['Her sessions are the calmest part of my week.', 'Priya Desai'],
    texts: [
      ['Aparna Kulkarni', 5, 'Beautiful, unhurried flows. My sleep has improved a lot.'],
      ['Vivek Joshi', 4, 'Great for evenings after work. Very calming voice.'],
    ],
    comments: [['Isha B.', 'Do you record the sessions?', 30]],
    qa: [['Do I need experience for the meditation sessions?', 'None at all. We start with simple breath-awareness and build up gradually — even five minutes a day is a good beginning.']],
  },
  {
    key: 'shweta',
    name: 'Shweta Shukla', slug: 'shweta-shukla', gender: 'female',
    city: 'Jaipur', locality: 'Vaishali Nagar', pincode: '302021',
    photo: GCS + 'Shweta-Shukla.jpg',
    styles: ['Yoga for Seniors'], headline: 'Yoga for Seniors',
    focus: ['Seniors', 'Gentle'], languages: ['English', 'Hindi'],
    years: 9, mode: 'offline', price: 500, trial: 0, team: 4.9,
    tagline: 'Yoga-for-seniors specialist with 9 years of experience in Jaipur. Gentle, chair-supported and joint-friendly sessions that older adults enjoy. Credentials verified directly with the issuing body.',
    bio: 'I work exclusively with older adults, adapting yoga to arthritis, balance concerns and post-surgery recovery.\n\nSessions are slow, encouraging and never rushed — chairs, walls and bolsters do most of the work so everyone can take part safely.',
    qualifications: '200-Hour YTT (Yoga Alliance); Senior Yoga Instructor Certification',
    certs: [
      ['200-Hour Yoga Teacher Training', 'Yoga Alliance', 'YS-07120', 'RYT 200'],
      ['Senior Yoga Instructor Certification', 'Yoga Alliance', 'YS-07121', null],
    ],
    formats: { offline: ['Private session', 500, 'At your home or at her Vaishali Nagar studio, chair-supported as needed.', true] },
    packages: [[10, 4500]],
    reviews: 110, acceptance: 0.97, responseHours: 16, monthly: 22, dist: [80, 16, 3, 1, 0],
    avail: [['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', 'T'], ['O', '-'], ['-', '-']],
    quote: ['Gentle, encouraging, never rushed — perfect for my mother.', 'Anjali Patel'],
    texts: [
      ['Sunil Agarwal', 5, 'My father looks forward to her sessions every morning.'],
      ['Rekha Mathur', 5, 'Safe, warm and very well paced for seniors.'],
      ['Manish Jain', 4, 'Excellent with knee and balance issues.'],
    ],
    comments: [['Alka G.', 'Does she visit homes in C-Scheme?', 18], ['Deepak S.', 'My mother is 74 and loves the classes.', 96]],
    qa: [['Can my mother join if she has knee arthritis?', 'Yes. Most of my students have arthritis. We use chairs and supports and stay well inside a comfortable range of movement.']],
  },
  {
    key: 'disha',
    name: 'Disha Nehra', slug: 'disha-nehra', gender: 'female',
    city: 'Gurugram', locality: 'Golf Course Road', pincode: '122002',
    photo: GCS + 'Disha-Nehra.jpg',
    styles: ['Corporate Wellness'], headline: 'Corporate Wellness',
    focus: ['Corporate', 'Beginners'], languages: ['English', 'Hindi'],
    years: 6, mode: 'online', price: 1400, trial: null, team: 5.0,
    tagline: 'Corporate wellness specialist with 6 years of experience running desk-yoga and stress-relief programmes for teams. Live online or on-site in Gurugram. Credentials verified directly with the issuing body.',
    bio: 'I design short, effective yoga and breathing programmes for offices — desk stretches, posture resets and stress-relief sessions that teams actually enjoy.\n\nProgrammes run weekly or monthly, online or on-site, and can be tailored to team size, schedule and seating.',
    qualifications: '200-Hour YTT (YTTAI); Corporate Wellness Programme Facilitator',
    certs: [
      ['200-Hour Yoga Teacher Training', 'YTTAI', 'YS-08233', 'RYT 200'],
      ['Corporate Wellness Programme Facilitator', 'YTTAI', 'YS-08234', null],
    ],
    formats: { online: ['Team session', 1400, 'A 45-minute live session for a team of up to 25, run over video call.', true] },
    packages: [[4, 5200]],
    reviews: 83, acceptance: 0.95, responseHours: 22, monthly: 8, dist: [90, 8, 2, 0, 0],
    avail: [['T', 'T'], ['T', 'T'], ['T', 'T'], ['T', 'T'], ['T', 'T'], ['-', '-'], ['-', '-']],
    quote: ['Our whole team looks forward to her Friday sessions.', 'HR, TechCorp'],
    texts: [
      ['Gaurav Sethi', 5, 'Practical desk-yoga our engineers actually use.'],
      ['Nidhi Bansal', 5, 'Professional, on time and well structured.'],
    ],
    comments: [['Varun K.', 'Do you offer monthly packages for teams of 30+?', 40]],
    qa: [['Can you run sessions on-site?', 'Yes, on-site in Gurugram or online. For on-site sessions we only need a clear floor space and about 45 minutes.']],
  },
  {
    key: 'nitu',
    name: 'Nitu Gupta', slug: 'nitu-gupta', gender: 'female',
    city: 'Lucknow', locality: 'Kamta', pincode: '226028',
    photo: null,
    styles: ['Yoga for Weight Loss', 'Hatha Yoga'], headline: 'Weight-loss & Hatha yoga',
    focus: ['Weight Loss', 'Hatha', 'Beginners'], languages: ['English', 'Hindi'],
    years: 5, mode: 'hybrid', price: 500, trial: 0, team: 4.7,
    tagline: 'Weight-loss and Hatha yoga teacher with 5 years of experience in Kamta and Gomti Nagar, Lucknow, and online. Sustainable routines, not crash programmes. Credentials verified directly with the issuing body.',
    bio: 'I help beginners lose weight sustainably with a mix of dynamic Hatha flows, core work and simple lifestyle habits.\n\nClasses are small, encouraging and paced for real life — with a weekly plan you can follow even on days you cannot attend.',
    qualifications: 'Diploma in Yoga Science; Weight-Management Yoga Instructor Course',
    certs: [
      ['Diploma in Yoga Science', 'AYUSH', 'YS-09044', 'Diploma in Yoga Science'],
    ],
    formats: {
      online: ['Private session', 450, 'Live one-on-one over video call with a weekly plan.', false],
      offline: ['Private session', 500, "At Nitu's Kamta studio or at your home in nearby areas.", true],
    },
    packages: [[12, 5200]],
    reviews: 18, acceptance: 0.93, responseHours: 10, monthly: 9, dist: [72, 22, 6, 0, 0],
    avail: [['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', 'O'], ['O', '-'], ['-', '-']],
    quote: ['Lost 6 kg in three months without feeling like I was on a diet.', 'Pooja Mishra'],
    texts: [
      ['Anita Srivastava', 5, 'Realistic routines and lots of encouragement.'],
      ['Ritu Pandey', 4, 'Good mix of yoga and diet guidance.'],
    ],
    comments: [['Shalini T.', 'Are there morning batches in Kamta?', 20]],
    qa: [['How many kilos can I expect to lose?', 'It depends on your starting point and routine, but most students see steady progress of 2–4 kg a month alongside better energy and sleep.']],
  },
];

// ------------------------------------------------------------ demo clients
// Named clients appear as reviewers on the pages; the rest fill the pool.
exports.namedClients = [
  'Neha Rao', 'Rohit Khanna', 'Arjun Mehta', 'Kavita Sharma', 'Priya Desai', 'Anjali Patel', 'HR, TechCorp',
  'Meera Iyer', 'Ananya Kapoor', 'Priya Nair', 'Rahul Verma', 'Sana Khan', 'Nandini Rao', 'Karan Malhotra',
  'Divya Pillai', 'Tarun Bhatia', 'Ishita Joshi', 'Aparna Kulkarni', 'Vivek Joshi', 'Sunil Agarwal',
  'Rekha Mathur', 'Manish Jain', 'Gaurav Sethi', 'Nidhi Bansal', 'Pooja Mishra', 'Anita Srivastava', 'Ritu Pandey',
];
exports.firstNames = ['Aarav', 'Aditi', 'Akash', 'Amit', 'Anjali', 'Ankita', 'Arnav', 'Bhavna', 'Chetan', 'Deepa', 'Dhruv', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Isha', 'Jatin', 'Kabir', 'Lavanya', 'Mohit', 'Naveen', 'Om', 'Payal', 'Qadir', 'Ritika', 'Sameer', 'Tanvi', 'Uday', 'Vandana', 'Yash', 'Zoya'];
exports.lastNames = ['Agarwal', 'Bose', 'Chopra', 'Dutta', 'Engineer', 'Fernandes', 'Ghosh', 'Hegde', 'Iyer', 'Jha', 'Kulkarni', 'Lal', 'Menon', 'Naidu', 'Oberoi', 'Pandey', 'Qureshi', 'Reddy', 'Saxena', 'Tiwari', 'Upadhyay', 'Vyas', 'Wadhwa'];

// ------------------------------------------------------------ requirements
// posted: days ago (0 = today). applicants: teacher keys; the first `decided` of them
// have been answered by the client (approved / rejected), the rest are still pending.
exports.requirements = [
  {
    id: 1, client: 'Meenal Verma',
    title: 'Looking for a Hatha yoga teacher for morning sessions',
    style: 'Hatha Yoga', mode: 'offline', city: 'Lucknow', locality: 'Gomti Nagar',
    level: 'beginner', budget: [600, 900], schedule: 'Mornings, 3x per week', posted: 2, status: 'open',
    slots: ['Morning (7-10am)'], days: [[1, '7:00 AM'], [3, '7:00 AM'], [5, '7:00 AM']],
    description: 'Family of 3 (including one senior) looking for a patient Hatha teacher for home sessions, 3 mornings a week. Prefer someone experienced with beginners and joint mobility.',
    needs: [
      'A patient teaching style suited to a beginner in the family',
      'Experience with joint mobility and senior-friendly modifications',
      'Comfortable teaching in a home / in-studio setting in Lucknow',
      'Able to commit to a consistent 3x/week morning schedule',
    ],
    applicants: [['shikhar', 'pending'], ['nitu', 'pending'], ['shweta', 'rejected']],
  },
  {
    client: 'Kunal Batra',
    title: 'Online Ashtanga teacher for daily 6 AM practice',
    style: 'Ashtanga / Power', mode: 'online', city: null, locality: null,
    level: 'advanced', budget: [500, 700], schedule: 'Daily, 6:00 AM IST', posted: 4, status: 'open',
    slots: ['Early morning (5-7am)'], days: [[1, '6:00 AM'], [2, '6:00 AM'], [3, '6:00 AM'], [4, '6:00 AM'], [5, '6:00 AM'], [6, '6:00 AM'], [7, '6:00 AM']],
    description: 'Intermediate practitioner (2 years Ashtanga) looking for a teacher for guided daily practice over video call. Consistency matters more than fancy scheduling.',
    needs: ['Ashtanga primary series experience', 'Can teach live over video at 6:00 AM IST', 'Comfortable correcting form through the camera'],
    applicants: [['vikas', 'pending'], ['shamli', 'pending']],
  },
  {
    client: 'Ritu Malhotra',
    title: 'Prenatal yoga, second trimester, twice a week',
    style: 'Prenatal Yoga', mode: 'either', city: 'Delhi', locality: 'Saket',
    level: 'any', budget: [800, 1200], schedule: 'Flexible, 2x per week', posted: 7, status: 'matched',
    slots: ['Morning (7-10am)', 'Evening (5-8pm)'], days: [[2, '10:00 AM'], [5, '10:00 AM']],
    description: 'Looking for a certified prenatal instructor for the rest of my second trimester. Comfortable with either in-studio near Saket or online.',
    needs: ['Certified in prenatal yoga', 'Trimester-appropriate modifications', 'Flexible between studio and online'],
    applicants: [['amrita', 'approved'], ['shachi', 'rejected']],
  },
  {
    client: 'Ankur Bhardwaj',
    title: 'Corporate wellness sessions for a 20-person team',
    style: 'Corporate Wellness', mode: 'offline', city: 'Gurugram', locality: 'Golf Course Road',
    level: 'beginner', budget: null, budgetNote: 'Package pricing preferred', schedule: 'Weekly, Friday afternoons', posted: 0, status: 'open',
    slots: ['Afternoon (1-5pm)'], days: [[5, '3:00 PM']],
    description: 'Startup office looking for a weekly 45-minute desk-yoga and stress-relief session for the team. Ongoing engagement, open to a monthly package.',
    needs: ['Experience running corporate / group sessions', 'Desk-friendly sequences that need no mats', 'Open to a monthly package'],
    applicants: [['disha', 'pending']],
  },
  {
    client: 'Farah Siddiqui',
    title: 'Yoga therapy for chronic lower back pain',
    style: 'Therapeutic Yoga', mode: 'offline', city: 'Bengaluru', locality: 'Indiranagar',
    level: 'any', budget: [900, 1400], schedule: '2x per week, evenings', posted: 14, status: 'closed',
    slots: ['Evening (5-8pm)'], days: [[2, '6:00 PM'], [4, '6:00 PM']],
    description: 'Recovering from a back injury, doctor-recommended therapeutic yoga. Need someone experienced with injury rehab, not a general fitness instructor.',
    needs: ['Trained in yoga therapy / injury rehab', 'Willing to coordinate with my physiotherapist'],
    applicants: [['shachi', 'approved']],
  },
  {
    client: 'Sonal Awasthi',
    title: 'Yoga Teacher Required',
    style: 'Yoga for Weight Loss', mode: 'offline', city: 'Lucknow', locality: 'Kamta',
    level: 'beginner', budget: [500, 800], schedule: 'Evenings, 5x per week', posted: 3, status: 'open',
    slots: ['Evening (5-8pm)'], days: [[1, '6:00 PM'], [2, '6:00 PM'], [3, '6:00 PM'], [4, '6:00 PM'], [5, '6:00 PM']],
    description: 'Looking for a yoga teacher near Kamta for a small evening group focused on weight loss and general fitness. Beginners welcome, 5 evenings a week.',
    needs: ['Experience with weight-loss oriented yoga', 'Can teach a small group of 4–5 people', 'Located in or near Kamta, Lucknow'],
    applicants: [['nitu', 'pending']],
  },
  {
    client: 'Prakash Dixit',
    title: 'Yoga Instructor for Senior Citizens',
    style: 'Yoga for Seniors', mode: 'offline', city: 'Lucknow', locality: 'Gomti Nagar',
    level: 'beginner', budget: [700, 1000], schedule: 'Mornings, daily', posted: 5, status: 'open',
    slots: ['Early morning (5-7am)', 'Morning (7-10am)'], days: [[1, '6:30 AM'], [2, '6:30 AM'], [3, '6:30 AM'], [4, '6:30 AM'], [5, '6:30 AM'], [6, '6:30 AM']],
    description: 'Residents of our Gomti Nagar society are looking for a gentle yoga instructor for a senior citizens group (60+). Chair-supported practice preferred.',
    needs: ['Experience with 60+ students', 'Chair-supported and joint-friendly practice', 'Available on weekday mornings'],
    applicants: [['shikhar', 'pending']],
  },
];
