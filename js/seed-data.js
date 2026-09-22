// Default seed and fallback data for Yeasin Arafat's Portfolio

export const DEFAULT_PROFILE = {
  name: "Yeasin Arafat",
  title: "Web Developer & Web Designer",
  photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
  shortBio: "I build modern, responsive and user-focused websites and web applications that turn ideas into powerful digital experiences.",
  fullBio: "Web Developer and Web Designer from Bangladesh with a Diploma in Engineering in Computer Technology. Specializing in high-performance web applications, modern interfaces, and scalable solutions.",
  location: "Dhaka, Bangladesh",
  email: "arafatujjol567@gmail.com",
  phone: "+880 1700-000000",
  availability: "Available for Freelance & Full-time Roles",
  updatedAt: new Date().toISOString()
};

export const DEFAULT_ABOUT = {
  content: "I am Yeasin Arafat, a Web Developer and Web Designer from Bangladesh. I completed my Diploma in Engineering in Computer Technology, where I developed a strong foundation in computer systems, programming, networking, database management and software development.\n\nMy main focus is web development, especially PHP and Laravel. I enjoy solving problems, learning modern technologies and building clean, responsive and user-friendly digital experiences.",
  subheading: "Crafting digital experiences with precision, logic, and modern design.",
  cvUrl: "#contact",
  updatedAt: new Date().toISOString()
};

export const DEFAULT_STATISTICS = [
  { id: "stat_1", value: "50+", label: "Projects Completed", order: 1 },
  { id: "stat_2", value: "30+", label: "Happy Clients", order: 2 },
  { id: "stat_3", value: "3+", label: "Years Experience", order: 3 },
  { id: "stat_4", value: "15+", label: "Technologies", order: 4 }
];

export const DEFAULT_SKILLS = [
  { id: "skill_1", name: "HTML5", category: "Frontend", level: 95, enabled: true, order: 1 },
  { id: "skill_2", name: "CSS3", category: "Frontend", level: 92, enabled: true, order: 2 },
  { id: "skill_3", name: "JavaScript", category: "Frontend", level: 88, enabled: true, order: 3 },
  { id: "skill_4", name: "Bootstrap", category: "Frontend", level: 90, enabled: true, order: 4 },
  { id: "skill_5", name: "PHP", category: "Backend", level: 92, enabled: true, order: 5 },
  { id: "skill_6", name: "Laravel", category: "Backend", level: 90, enabled: true, order: 6 },
  { id: "skill_7", name: "MySQL", category: "Database", level: 86, enabled: true, order: 7 },
  { id: "skill_8", name: "WordPress", category: "CMS", level: 88, enabled: true, order: 8 },
  { id: "skill_9", name: "REST API", category: "Backend", level: 89, enabled: true, order: 9 },
  { id: "skill_10", name: "Git", category: "Tools", level: 85, enabled: true, order: 10 },
  { id: "skill_11", name: "GitHub", category: "Tools", level: 88, enabled: true, order: 11 },
  { id: "skill_12", name: "Flutter", category: "Mobile", level: 78, enabled: true, order: 12 },
  { id: "skill_13", name: "UI/UX Design", category: "Design", level: 86, enabled: true, order: 13 },
  { id: "skill_14", name: "Responsive Web Design", category: "Design", level: 96, enabled: true, order: 14 }
];

export const DEFAULT_SERVICES = [
  {
    id: "serv_1",
    title: "Web Development",
    description: "Full-cycle custom website development with fast loading speeds, clean architecture, and standards-compliant code.",
    icon: "code",
    enabled: true,
    order: 1
  },
  {
    id: "serv_2",
    title: "Web Design",
    description: "Creative, aesthetic, and user-centric website designs featuring modern typography, glassmorphism, and responsive layouts.",
    icon: "palette",
    enabled: true,
    order: 2
  },
  {
    id: "serv_3",
    title: "Laravel Development",
    description: "Robust, enterprise-grade MVC web applications, administrative panels, CRM dashboards, and modular backends.",
    icon: "layers",
    enabled: true,
    order: 3
  },
  {
    id: "serv_4",
    title: "E-commerce Development",
    description: "High-converting online store solutions with shopping cart flows, payment gateway integrations, and inventory control.",
    icon: "shopping-bag",
    enabled: true,
    order: 4
  },
  {
    id: "serv_5",
    title: "Business Website Development",
    description: "Professional corporate websites that build credibility, generate leads, and showcase brand identity effectively.",
    icon: "briefcase",
    enabled: true,
    order: 5
  },
  {
    id: "serv_6",
    title: "API Development",
    description: "Secure, scalable RESTful API services for web, mobile apps, and third-party integrations with clean documentation.",
    icon: "cpu",
    enabled: true,
    order: 6
  },
  {
    id: "serv_7",
    title: "WordPress Development",
    description: "Custom WordPress themes, plugins, WooCommerce setups, and content management solutions that are easy to manage.",
    icon: "globe",
    enabled: true,
    order: 7
  },
  {
    id: "serv_8",
    title: "Website Maintenance",
    description: "Ongoing bug fixes, security updates, performance tuning, and technical support to keep websites fast and secure.",
    icon: "shield",
    enabled: true,
    order: 8
  }
];

export const DEFAULT_PROJECTS = [
  {
    id: "proj_1",
    title: "E-Commerce Multi-Vendor Hub",
    category: "Full Stack",
    description: "A high-performance modern e-commerce platform with automated inventory, customer orders tracking, and Stripe/bKash checkout.",
    thumbnail: "https://images.unsplash.com/photo-1557821552-17105176677c?w=800&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1557821552-17105176677c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80"
    ],
    technologies: ["Laravel", "PHP", "MySQL", "JavaScript", "Tailwind CSS"],
    liveUrl: "https://example.com/ecommerce",
    githubUrl: "https://github.com/yeasin-arafat",
    featured: true,
    published: true,
    order: 1
  },
  {
    id: "proj_2",
    title: "Corporate Agency & Client Portal",
    category: "Web Design",
    description: "Sleek dark-mode digital agency portal with interactive project showcases, client reviews, and instant quotation calculator.",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80"
    ],
    technologies: ["HTML5", "CSS3", "JavaScript", "Bootstrap", "UI/UX"],
    liveUrl: "https://example.com/agency",
    githubUrl: "https://github.com/yeasin-arafat",
    featured: true,
    published: true,
    order: 2
  },
  {
    id: "proj_3",
    title: "Hospital Management & Appointment System",
    category: "Web Application",
    description: "Full-featured clinic management system with doctor scheduling, patient medical records, and automated SMS reminders.",
    thumbnail: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80"
    ],
    technologies: ["Laravel", "REST API", "MySQL", "Vue/JS"],
    liveUrl: "https://example.com/hospital",
    githubUrl: "https://github.com/yeasin-arafat",
    featured: true,
    published: true,
    order: 3
  },
  {
    id: "proj_4",
    title: "Modern Real Estate Listings Engine",
    category: "Full Stack",
    description: "Property discovery platform with geolocation filters, image sliders, floorplan viewers, and instant agent contact forms.",
    thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80"
    ],
    technologies: ["PHP", "Laravel", "MySQL", "JavaScript"],
    liveUrl: "https://example.com/realestate",
    githubUrl: "https://github.com/yeasin-arafat",
    featured: false,
    published: true,
    order: 4
  }
];

export const DEFAULT_EXPERIENCES = [
  {
    id: "exp_1",
    jobTitle: "Senior Web Developer & Designer",
    company: "Freelance & Remote Clients",
    location: "Remote / Worldwide",
    startDate: "2023",
    endDate: "Present",
    description: "Architecting custom full-stack web solutions, developing dynamic Laravel applications, and designing high-converting responsive interfaces for clients globally.",
    companyLogo: "",
    order: 1
  },
  {
    id: "exp_2",
    jobTitle: "Web Developer",
    company: "Creative Tech Solutions",
    location: "Dhaka, Bangladesh",
    startDate: "2021",
    endDate: "2023",
    description: "Developed and maintained corporate websites, crafted custom WordPress themes, built RESTful APIs, and optimized database queries for high-traffic sites.",
    companyLogo: "",
    order: 2
  }
];

export const DEFAULT_EDUCATION = [
  {
    id: "edu_1",
    degree: "Diploma in Engineering",
    field: "Computer Technology",
    institution: "Polytechnic Institute, Bangladesh",
    startYear: "2019",
    endYear: "2023",
    description: "Comprehensive engineering curriculum covering software engineering, computer networks, database systems, web development, algorithms, and microprocessors.",
    order: 1
  }
];

export const DEFAULT_CERTIFICATIONS = [
  {
    id: "cert_1",
    title: "Full-Stack Web Development & Laravel",
    organization: "Technical Training & Certification Board",
    issueDate: "2023",
    credentialId: "CERT-LAR-9921",
    credentialUrl: "https://example.com/verify/cert1",
    imageUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80",
    order: 1
  },
  {
    id: "cert_2",
    title: "Responsive Web Design & Modern UI/UX",
    organization: "Global Digital Academy",
    issueDate: "2022",
    credentialId: "CERT-UI-4819",
    credentialUrl: "https://example.com/verify/cert2",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80",
    order: 2
  }
];

export const DEFAULT_TESTIMONIALS = [
  {
    id: "test_1",
    clientName: "David Henderson",
    company: "Apex Innovations LLC",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    testimonial: "Yeasin delivers top-tier work! He built our complete web application with Laravel and gave it an exceptionally modern, fast UI. Highly recommended developer.",
    rating: 5,
    enabled: true,
    order: 1
  },
  {
    id: "test_2",
    clientName: "Sarah Jenkins",
    company: "Nordic Commerce",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    testimonial: "The website Yeasin built exceeded our expectations. Clean code, prompt communication, and flawless responsiveness across phones and desktops.",
    rating: 5,
    enabled: true,
    order: 2
  },
  {
    id: "test_3",
    clientName: "Michael Chang",
    company: "Nexus Digital Studio",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    testimonial: "Outstanding design sense and strong technical ability. Yeasin took our rough ideas and transformed them into a breathtaking digital portfolio.",
    rating: 5,
    enabled: true,
    order: 3
  }
];

export const DEFAULT_CLIENTS = [
  { id: "client_1", name: "Apex Global", logoUrl: "", websiteUrl: "https://example.com", enabled: true, order: 1 },
  { id: "client_2", name: "Nordic Commerce", logoUrl: "", websiteUrl: "https://example.com", enabled: true, order: 2 },
  { id: "client_3", name: "Nexus Digital", logoUrl: "", websiteUrl: "https://example.com", enabled: true, order: 3 },
  { id: "client_4", name: "CloudScale Inc", logoUrl: "", websiteUrl: "https://example.com", enabled: true, order: 4 },
  { id: "client_5", name: "Vanguard Media", logoUrl: "", websiteUrl: "https://example.com", enabled: true, order: 5 }
];

export const DEFAULT_SOCIAL_LINKS = [
  { id: "soc_github", platform: "GitHub", url: "https://github.com/yeasin-arafat", icon: "github", enabled: true, order: 1 },
  { id: "soc_linkedin", platform: "LinkedIn", url: "https://linkedin.com/in/yeasin-arafat", icon: "linkedin", enabled: true, order: 2 },
  { id: "soc_facebook", platform: "Facebook", url: "https://facebook.com/yeasin.arafat", icon: "facebook", enabled: true, order: 3 },
  { id: "soc_whatsapp", platform: "WhatsApp", url: "https://wa.me/8801700000000", icon: "message-circle", enabled: true, order: 4 },
  { id: "soc_twitter", platform: "X/Twitter", url: "https://twitter.com/yeasin_arafat", icon: "twitter", enabled: true, order: 5 },
  { id: "soc_instagram", platform: "Instagram", url: "https://instagram.com/yeasin_arafat", icon: "instagram", enabled: true, order: 6 },
  { id: "soc_youtube", platform: "YouTube", url: "https://youtube.com/@yeasin-arafat", icon: "youtube", enabled: true, order: 7 }
];

export const DEFAULT_SETTINGS = {
  siteName: "Yeasin Arafat",
  logoUrl: "",
  faviconUrl: "/public/icon.svg",
  metaTitle: "Yeasin Arafat | Web Developer & Web Designer",
  metaDescription: "Yeasin Arafat - Web Developer & Web Designer specializing in modern, responsive websites, Laravel applications, and user-friendly digital experiences.",
  footerText: "Building modern, responsive, and user-focused web solutions that turn creative ideas into powerful digital experiences.",
  copyright: "© 2026 Yeasin Arafat. All rights reserved.",
  contactEmail: "arafatujjol567@gmail.com",
  contactPhone: "+880 1700-000000",
  address: "Dhaka, Bangladesh"
};
