"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  isSupabaseConfigured,
  supabase,
  dbService
} from "@/services/supabase";
import { generatePptxFile, PresentationData, cleanMarkdownText } from "@/services/pptxGenerator";
import {
  Send,
  Upload,
  Clipboard,
  Camera,
  Layers,
  Sparkles,
  BookOpen,
  HelpCircle,
  Bookmark,
  History,
  LogOut,
  Copy,
  Plus,
  Search,
  Check,
  AlertTriangle,
  Lightbulb,
  Book,
  ChevronDown,
  ChevronUp,
  SearchCode,
  Globe,
  Compass,
  Menu,
  X,
  Mic,
  GraduationCap,
  MoreHorizontal,
  Zap,
  Home as HomeIcon,
  FileText,
  Crown,
  Share2,
  Paperclip,
  User,
  Settings as SettingsIcon,
  MessageSquare,
  Calendar,
  Download,
  Edit2,
  Trash2,
  Pencil
} from "lucide-react";
import {
  GeminiStudyResponse,
  GeminiFormulaItem,
  GeminiExampleItem,
  GeminiQuizQuestion
} from "@/services/ai/gemini";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  // Sidebar controls for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active view in workspace
  const [currentTab, setCurrentTab] = useState("Home"); // Home | Quiz | Notes | Study Plan | Settings | Profile
  const [settingsTab, setSettingsTab] = useState<"history" | "saved" | "config">("history");

  // Workspace Chat State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [aiMode, setAiMode] = useState("chat"); // chat | all-in-one | easy | normal | formula | example | exam | memory | quiz | research
  const [isLoading, setIsLoading] = useState(false);

  // Model Selection Dropdown
  const [activeModel, setActiveModel] = useState("gemini-3.6-flash");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // API Keys state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");

  // File Upload State
  const [attachedImage, setAttachedImage] = useState<string | null>(null); // base64
  const [attachedImageMime, setAttachedImageMime] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Saved Answers Library State
  const [savedAnswers, setSavedAnswers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Usage Tracker
  const [usageLimit, setUsageLimit] = useState({ count: 0, max: 10 });

  // Quiz Interaction State
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, string>>({}); // quizIndex -> option
  const [submittedQuizzes, setSubmittedQuizzes] = useState<Record<string, boolean>>({}); // quizIndex -> submitted
  const [quizScores, setQuizScores] = useState({ score: 0, total: 0 });

  // Accordion UI State
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    quick_answer: true,
    easy_explanation: true,
    normal_solution: true,
    formula: true,
    example: true,
    exam: true,
    memory: true,
    quiz: true
  });

  // Action feedback
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devConfigError, setDevConfigError] = useState<string | null>(null);

  // Quiz Module Interactive States
  const [activePlayingQuiz, setActivePlayingQuiz] = useState<any | null>(null);
  const [playingQuizCurrentIndex, setPlayingQuizCurrentIndex] = useState(0);
  const [playingQuizAnswers, setPlayingQuizAnswers] = useState<Record<number, string>>({});
  const [playingQuizSubmitted, setPlayingQuizSubmitted] = useState(false);
  const [playingQuizScore, setPlayingQuizScore] = useState(0);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [newQuizTopic, setNewQuizTopic] = useState("");
  const [newQuizDifficulty, setNewQuizDifficulty] = useState("Easy");
  const [newQuizNumQuestions, setNewQuizNumQuestions] = useState(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [searchQuizQuery, setSearchQuizQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");

  // Notes Module Interactive States
  const [notesHistory, setNotesHistory] = useState<any[]>([
    {
      id: "n-newton",
      title: "Newton's Laws of Motion",
      content: "Complete notes on Newton's three laws with examples and formulas.\n\nFirst Law: A body remains at rest or in uniform motion unless acted upon by an external force.\nSecond Law: The acceleration of an object depends on the mass of the object and the amount of force applied (F = ma).\nThird Law: For every action, there is an equal and opposite reaction.",
      subject: "Physics",
      createdOn: "24 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-quadratic",
      title: "Quadratic Equations",
      content: "Important formulas, methods to solve quadratic equations and practice problems.\n\nGeneral form: ax^2 + bx + c = 0.\nDiscriminant: D = b^2 - 4ac.\nRoots: x = (-b ± √D) / 2a.\nIf D > 0: roots are real and distinct.\nIf D = 0: roots are real and equal.",
      subject: "Mathematics",
      createdOn: "23 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-dbms",
      title: "DBMS Normalization",
      content: "1NF, 2NF, 3NF, BCNF explained with examples and diagrams.\n\n1NF: Atomic values only.\n2NF: In 1NF and no partial dependencies.\n3NF: In 2NF and no transitive dependencies.\nBCNF: In 3NF and for any dependency X -> Y, X must be a superkey.",
      subject: "Computer Science",
      createdOn: "22 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-bonding",
      title: "Chemical Bonding",
      content: "Ionic, Covalent and Metallic bonding with real life examples.\n\nIonic: Transfer of electrons between metals and non-metals.\nCovalent: Sharing of electron pairs between non-metal atoms.\nMetallic: Shared sea of valence electrons among positive metal ions.",
      subject: "Chemistry",
      createdOn: "21 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-photosynthesis",
      title: "Photosynthesis Process",
      content: "Detailed explanation of photosynthesis with diagram.\n\nCarbon dioxide + Water + Light energy -> Glucose + Oxygen.\nLight reaction occurs in the thylakoid membranes.\nCalvin cycle occurs in the stroma.",
      subject: "Biology",
      createdOn: "20 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-java",
      title: "Java OOPs Concepts",
      content: "Notes on classes, objects, inheritance, polymorphism and abstraction.\n\nEncapsulation: Restricting direct access using private modifiers and public getters/setters.\nInheritance: Reusing code from superclass using extends keyword.\nPolymorphism: Overloading (compile-time) and overriding (runtime).\nAbstraction: Hiding implementation details using interfaces or abstract classes.",
      subject: "Computer Science",
      createdOn: "19 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-work",
      title: "Work Energy Theorem",
      content: "Work, kinetic energy and the work-energy theorem explained.\n\nWork done: W = F * d * cos(θ).\nKinetic energy: KE = 0.5 * m * v^2.\nTheorem: The net work done on an object is equal to the change in its kinetic energy (W = ΔKE).",
      subject: "Physics",
      createdOn: "18 May, 2025",
      isBookmarked: false
    },
    {
      id: "n-trig",
      title: "Trigonometric Identities",
      content: "All important trigonometric identities with proofs.\n\nPythagorean: sin^2(θ) + cos^2(θ) = 1.\nReciprocal: csc(θ) = 1/sin(θ), sec(θ) = 1/cos(θ).\nDouble angle: sin(2θ) = 2sin(θ)cos(θ), cos(2θ) = cos^2(θ) - sin^2(θ).",
      subject: "Mathematics",
      createdOn: "17 May, 2025",
      isBookmarked: false
    }
  ]);

  const [foldersList, setFoldersList] = useState<any[]>([
    { id: "f-physics", name: "Physics", notesCount: 12 },
    { id: "f-maths", name: "Mathematics", notesCount: 8 },
    { id: "f-cs", name: "Computer Science", notesCount: 10 },
    { id: "f-chemistry", name: "Chemistry", notesCount: 6 }
  ]);

  const [activeFolderFilter, setActiveFolderFilter] = useState("All");
  const [searchNotesQuery, setSearchNotesQuery] = useState("");
  const [sortNotesBy, setSortNotesBy] = useState("Recent");
  const [selectedNoteForView, setSelectedNoteForView] = useState<any | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteSubject, setNewNoteSubject] = useState("Physics");
  const [isProcessingNoteAI, setIsProcessingNoteAI] = useState(false);
  const [noteAIResult, setNoteAIResult] = useState<string | null>(null);
  const [noteAIActionType, setNoteAIActionType] = useState<string | null>(null);

  // Profile Module States
  const [profileData, setProfileData] = useState<any>({
    fullName: "",
    emailAddress: "",
    phoneNumber: "",
    dob: "",
    gender: "",
    location: "",
    aboutMe: "",
    joinedOn: "Joined on 24 May, 2025",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"
  });

  // Fields currently being edited in Profile Tab
  const [editProfileFields, setEditProfileFields] = useState<Record<string, string>>({});
  const [activeProfileTab, setActiveProfileTab] = useState("Personal Info");
  const [showEditAllModal, setShowEditAllModal] = useState(false);

  // History Module Interactive States
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const [historySubjectFilter, setHistorySubjectFilter] = useState("All");
  const [historyQuickFilter, setHistoryQuickFilter] = useState("All");
  const [showHistoryActionMenuId, setShowHistoryActionMenuId] = useState<string | null>(null);

  // Chat Delete & Rename Modal State
  const [deletingConv, setDeletingConv] = useState<any | null>(null);
  const [renamingConv, setRenamingConv] = useState<any | null>(null);
  const [renameInputTitle, setRenameInputTitle] = useState("");
  const [activeSidebarMenuConvId, setActiveSidebarMenuConvId] = useState<string | null>(null);

  const handleDeleteConversation = async (conv: any) => {
    if (!conv) return;
    const userId = user?.id || user?.email || "demo-user-123";
    await dbService.deleteConversation(userId, conv.id);
    const updatedList = await dbService.getConversations(userId);
    setConversations(updatedList);
    if (activeConvId === conv.id) {
      if (updatedList.length > 0) {
        setActiveConvId(updatedList[0].id);
      } else {
        startNewConversation();
      }
    }
    setDeletingConv(null);
    setActiveSidebarMenuConvId(null);
    setShowHistoryActionMenuId(null);
  };

  const handleRenameConversation = async (conv: any, newTitle: string) => {
    if (!conv || !newTitle.trim()) return;
    const userId = user?.id || user?.email || "demo-user-123";
    const cleanTitle = newTitle.trim();
    await dbService.renameConversation(userId, conv.id, cleanTitle);
    setConversations(prev =>
      prev.map(c => (c.id === conv.id ? { ...c, title: cleanTitle } : c))
    );
    setRenamingConv(null);
    setRenameInputTitle("");
    setActiveSidebarMenuConvId(null);
    setShowHistoryActionMenuId(null);
  };

  const handleDownloadPptx = async (title: string, msgData?: any) => {
    try {
      let presentationObj: PresentationData;

      if (msgData?.presentation?.slides && Array.isArray(msgData.presentation.slides) && msgData.presentation.slides.length > 0) {
        presentationObj = {
          topic: msgData.presentation.topic || title || "Presentation",
          slides: msgData.presentation.slides
        };
      } else {
        const topicName = title || msgData?.topic || "Study Presentation";
        const contentText = msgData?.normal_solution || msgData?.quick_answer || "Complete Presentation Content";
        const points = (msgData?.important_points && msgData.important_points.length > 0) 
          ? msgData.important_points 
          : contentText.split("\n").filter((l: string) => l.trim().length > 10).slice(0, 15);

        const slides = [
          {
            title: `Introduction to ${topicName}`,
            subtitle: msgData?.easy_explanation ? msgData.easy_explanation.substring(0, 120) : `Core concepts and overview of ${topicName}`,
            bulletPoints: points.slice(0, 3).length > 0 ? points.slice(0, 3) : [`Overview of ${topicName}`, "Core principles", "Key foundations"],
            keyTakeaway: msgData?.easy_explanation || `Overview of ${topicName}`
          },
          {
            title: `Key Concepts & Solutions`,
            subtitle: "Detailed analysis and core principles",
            bulletPoints: points.slice(3, 7).length > 0 ? points.slice(3, 7) : ["Primary technical detail", "System behavior", "Implementation principle"],
            keyTakeaway: msgData?.memory_trick || "Core solution principle"
          },
          {
            title: `Technical Execution & Formulas`,
            subtitle: "Step-by-step breakdown",
            bulletPoints: msgData?.formulas?.map((f: any) => `${f.formula}: ${f.meaning}`) || (points.slice(7, 10).length > 0 ? points.slice(7, 10) : ["Technical step 1", "Technical step 2", "Validation"]),
            keyTakeaway: "Verified mathematical & technical proof"
          },
          {
            title: `Real-World Applications`,
            subtitle: "Practical usage scenarios",
            bulletPoints: msgData?.examples?.map((e: any) => `${e.scenario} - ${e.explanation}`) || (points.slice(10, 13).length > 0 ? points.slice(10, 13) : ["Practical scenario A", "Production usage", "Performance outcome"]),
            keyTakeaway: "Practical application in real-world context"
          },
          {
            title: `Summary & Action Points`,
            subtitle: "Key takeaways and next steps",
            bulletPoints: msgData?.common_mistakes?.length > 0 
              ? msgData.common_mistakes.map((m: string) => `Avoid: ${m}`)
              : ["Review core principles", "Execute step-by-step instructions", "Verify final results"],
            keyTakeaway: "Actionable conclusion and final steps"
          }
        ];

        presentationObj = {
          topic: topicName,
          slides
        };
      }

      await generatePptxFile(presentationObj);
    } catch (err) {
      console.error("Failed to generate PPTX:", err);
      alert("Failed to generate PPTX presentation file. Please try again.");
    }
  };




  // Streak System States
  const [streakHistory, setStreakHistory] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [streakLastDate, setStreakLastDate] = useState<string>("");

  // Streak Modal & Quiz States
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakModalView, setStreakModalView] = useState("rewards"); // rewards | categories | loading | playing | score
  const [selectedStreakCategory, setSelectedStreakCategory] = useState("");
  const [streakQuiz, setStreakQuiz] = useState<any>(null);
  const [streakQuizAnswers, setStreakQuizAnswers] = useState<Record<number, string>>({});
  const [streakQuizCurrentIndex, setStreakQuizCurrentIndex] = useState(0);
  const [streakQuizScore, setStreakQuizScore] = useState(0);
  const [streakQuizIsLoading, setStreakQuizIsLoading] = useState(false);
  const [streakEarnedNewToday, setStreakEarnedNewToday] = useState(false);

  // Brain Mini Games State for Daily Streak Offer & Mind Training
  const [selectedBrainGame, setSelectedBrainGame] = useState<string>("rule_switch");
  const [brainGameScore, setBrainGameScore] = useState<number>(0);
  const [brainGameRound, setBrainGameRound] = useState<number>(0);

  // Dynamic Game Session States
  const [ruleSwitchCurrent, setRuleSwitchCurrent] = useState<any>(null);
  const [ruleSwitchSelected, setRuleSwitchSelected] = useState<string | null>(null);

  const [sequenceTarget, setSequenceTarget] = useState<string[]>([]);
  const [sequenceUser, setSequenceUser] = useState<string[]>([]);
  const [sequencePhase, setSequencePhase] = useState<"preview" | "recall" | "result">("preview");
  const [activeSeqIndex, setActiveSeqIndex] = useState<number | null>(null);

  const [wordScrambleCurrent, setWordScrambleCurrent] = useState<any>(null);
  const [unscrambleInput, setUnscrambleInput] = useState<string>("");

  const [dualTaskCurrent, setDualTaskCurrent] = useState<any>(null);
  const [dualTaskUserSelected, setDualTaskUserSelected] = useState<number[]>([]);

  // Level Progression System States (Levels 1 to 100 per game)
  const [selectedGameLevel, setSelectedGameLevel] = useState<number>(1);
  const [levelPage, setLevelPage] = useState<number>(1); // Page 1: 1-10, Page 2: 11-20, Page 3: 21-30, ... Page 10: 91-100
  const [completedGameLevels, setCompletedGameLevels] = useState<Record<string, number[]>>({
    rule_switch: [1],
    sequence_memory: [],
    word_scramble: [],
    dual_task: []
  });
  const [viewingLevelResult, setViewingLevelResult] = useState<number | null>(null);

  // Real-time Game Timer (Starts from 0s)
  const [gameTimerSeconds, setGameTimerSeconds] = useState<number>(0);
  const [gameTimerActive, setGameTimerActive] = useState<boolean>(false);
  const [gameFinalTime, setGameFinalTime] = useState<number>(0);

  // Real-time Game Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (gameTimerActive) {
      interval = setInterval(() => {
        setGameTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [gameTimerActive]);

  // Daily Leaderboard helper function (100% REAL COMPLETIONS ONLY - ZERO FAKE PLAYERS!)
  const getDailyLeaderboard = (gameId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const key = `quicksolv_leaderboard_${todayStr}_${gameId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return []; // ZERO FAKE PLAYERS! Returns empty array if no real completion recorded today.
  };

  // Complete Game Level Handler: Timer, Streak, Level Progress & Daily Leaderboard
  const handleFinishLevel = (finalScore: number) => {
    setGameTimerActive(false);
    const totalTime = gameTimerSeconds;
    setGameFinalTime(totalTime);

    // 1. Level Completion & Save Per-Level Scorecard
    const currentCompleted = completedGameLevels[selectedBrainGame] || [];
    if (!currentCompleted.includes(selectedGameLevel)) {
      const updated = {
        ...completedGameLevels,
        [selectedBrainGame]: [...currentCompleted, selectedGameLevel]
      };
      setCompletedGameLevels(updated);
      localStorage.setItem("quicksolv_completed_levels", JSON.stringify(updated));

      // Auto advance to next 10-level page when reaching end of page (e.g. lvl 10 -> page 2)
      if (selectedGameLevel % 10 === 0 && levelPage < 10) {
        setLevelPage(prev => prev + 1);
      }
    }

    // Save individual level result scorecard for green box click inspection
    const scorecard = {
      gameId: selectedBrainGame,
      level: selectedGameLevel,
      score: finalScore,
      timeSec: totalTime,
      dateCompleted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timeCompleted: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
    localStorage.setItem(`quicksolv_level_result_${selectedBrainGame}_${selectedGameLevel}`, JSON.stringify(scorecard));

    // 2. Real-Time Persistent Daily Streak (+1 per calendar day, min 1)
    recordStreakProgress();

    // 3. Update Today's Real Daily Leaderboard (Sorted by speed/lowest timeSec!)
    const todayStr = getTodayStr();
    const lbKey = `quicksolv_leaderboard_${todayStr}_${selectedBrainGame}`;
    const currentLb = getDailyLeaderboard(selectedBrainGame);
    const userName = user?.user_metadata?.full_name || profileData.fullName || "You (Player)";
    
    const userEntry = {
      name: userName,
      timeSec: totalTime,
      score: finalScore,
      avatar: "🌟",
      isCurrentUser: true,
      level: selectedGameLevel
    };

    const updatedLb = [...currentLb.filter((p: any) => !p.isCurrentUser || p.level !== selectedGameLevel), userEntry].sort((a: any, b: any) => a.timeSec - b.timeSec);
    localStorage.setItem(lbKey, JSON.stringify(updatedLb));

    setStreakModalView("score");
  };

  // Dynamic Smart Topic Title Generator (Replaces generic "Chat Conversation" with actual main topic)
  const getSmartChatTitle = (rawTitle?: string, fallbackPrompt?: string) => {
    if (
      rawTitle &&
      rawTitle.toLowerCase() !== "chat conversation" &&
      rawTitle.toLowerCase() !== "new conversation" &&
      rawTitle.toLowerCase() !== "untitled chat" &&
      rawTitle.trim().length > 0
    ) {
      return rawTitle;
    }
    const text = fallbackPrompt || "";
    if (!text) return "General Topic";

    const clean = text.trim().replace(/^[\s\W]+/, "");
    const words = clean.split(/\s+/).slice(0, 5).join(" ");
    if (!words) return "General Topic";
    const formatted = words.charAt(0).toUpperCase() + words.slice(1);
    return formatted.length > 28 ? formatted.substring(0, 28) + "..." : formatted;
  };

  // Load level progress, persistent daily streak & clean generic "Chat Conversation" titles on mount
  useEffect(() => {
    try {
      const savedLevels = localStorage.getItem("quicksolv_completed_levels");
      if (savedLevels) {
        setCompletedGameLevels(JSON.parse(savedLevels));
      }

      loadUserStreak(user);

      // Auto-upgrade any legacy "Chat Conversation" entries to real topic titles
      const savedDb = localStorage.getItem("snaptutor_mock_db");
      if (savedDb) {
        const db = JSON.parse(savedDb);
        if (db.conversations && Array.isArray(db.conversations)) {
          let changed = false;
          db.conversations.forEach((c: any) => {
            if (!c.title || c.title.toLowerCase() === "chat conversation") {
              const firstMsg = db.messages?.find((m: any) => m.conversation_id === c.id && m.role === "user");
              const newTitle = getSmartChatTitle(c.title, firstMsg?.content || c.description);
              if (newTitle !== c.title) {
                c.title = newTitle;
                changed = true;
              }
            }
          });
          if (changed) {
            localStorage.setItem("snaptutor_mock_db", JSON.stringify(db));
          }
        }
      }
    } catch {}
  }, []);

  // Dynamic Procedural Brain Game Generators (100% Unique per attempt for every user)
  const startBrainGameRound = (gameId: string, round: number, level: number = 1) => {
    const COLOR_EMOJIS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟧"];

    if (gameId === "rule_switch") {
      setRuleSwitchSelected(null);

      // Random archetype selection (10 dynamic rule types)
      const ruleType = Math.floor(Math.random() * 10);
      let rObj: any = {};

      if (ruleType === 0) {
        const targetColor = COLOR_EMOJIS[Math.floor(Math.random() * COLOR_EMOJIS.length)];
        const opts = [...COLOR_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 4);
        if (!opts.includes(targetColor)) opts[0] = targetColor;
        rObj = {
          rule: `Tap ${targetColor}`,
          desc: "Target Match: Tap the exact matching color symbol",
          correct: targetColor,
          options: opts.sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 1) {
        const avoidColor = COLOR_EMOJIS[Math.floor(Math.random() * COLOR_EMOJIS.length)];
        const validColors = COLOR_EMOJIS.filter(c => c !== avoidColor);
        const correctColor = validColors[Math.floor(Math.random() * validColors.length)];
        const opts = [avoidColor, ...validColors.slice(0, 3)].sort(() => Math.random() - 0.5);
        rObj = {
          rule: `Tap anything NOT ${avoidColor} 🚫`,
          desc: "Inverse Rule: Tap any color except the prohibited color",
          correct: correctColor,
          options: opts
        };
      } else if (ruleType === 2) {
        const wantEven = Math.random() > 0.5;
        const evenNum = (Math.floor(Math.random() * 40) + 1) * 2;
        const oddSet = new Set<number>();
        while (oddSet.size < 3) {
          oddSet.add((Math.floor(Math.random() * 40)) * 2 + 1);
        }
        const odds = Array.from(oddSet).map(n => n.toString());
        rObj = {
          rule: wantEven ? "⚡ RULE SWITCH! Tap EVEN numbers" : "⚡ RULE SWITCH! Tap ODD numbers",
          desc: wantEven ? "Focus on even values" : "Focus on odd values",
          correct: wantEven ? evenNum.toString() : odds[0],
          options: [evenNum.toString(), ...odds].sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 3) {
        const numSet = new Set<number>();
        while (numSet.size < 4) {
          numSet.add(Math.floor(Math.random() * 90) + 10);
        }
        const nums = Array.from(numSet);
        const maxVal = Math.max(...nums);
        rObj = {
          rule: "Tap the LARGEST number",
          desc: "Compare values and select the highest number",
          correct: maxVal.toString(),
          options: nums.map(n => n.toString()).sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 4) {
        const numSet = new Set<number>();
        while (numSet.size < 4) {
          numSet.add(Math.floor(Math.random() * 90) + 10);
        }
        const nums = Array.from(numSet);
        const minVal = Math.min(...nums);
        rObj = {
          rule: "Tap the SMALLEST number",
          desc: "Compare values and select the lowest number",
          correct: minVal.toString(),
          options: nums.map(n => n.toString()).sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 5) {
        const digitToAvoid = [3, 7, 5, 9][Math.floor(Math.random() * 4)];
        const badSet = new Set<string>();
        while (badSet.size < 3) {
          const val = Math.random() > 0.5
            ? `${Math.floor(Math.random() * 8) + 1}${digitToAvoid}`
            : `${digitToAvoid}${Math.floor(Math.random() * 8) + 1}`;
          badSet.add(val);
        }
        const bads = Array.from(badSet);
        const safe = "24";
        rObj = {
          rule: `Don't tap numbers containing digit ${digitToAvoid}`,
          desc: `Avoid any number with digit ${digitToAvoid}`,
          correct: safe,
          options: [...bads, safe].sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 6) {
        const threshold = (Math.floor(Math.random() * 5) + 3) * 10;
        const highNum = threshold + Math.floor(Math.random() * 20) + 5;
        const lowSet = new Set<number>();
        while (lowSet.size < 3) {
          lowSet.add(threshold - Math.floor(Math.random() * 15) - 1);
        }
        const lows = Array.from(lowSet).map(n => n.toString());
        rObj = {
          rule: `Tap numbers > ${threshold}`,
          desc: `Focus on numbers strictly greater than ${threshold}`,
          correct: highNum.toString(),
          options: [highNum.toString(), ...lows].sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 7) {
        const shapes = ["🔺 Triangle", "🟦 Square", "🟢 Circle", "⭐ Star"];
        const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
        rObj = {
          rule: `Tap ${targetShape}`,
          desc: "Target Match: Select the matching shape",
          correct: targetShape,
          options: [...shapes].sort(() => Math.random() - 0.5)
        };
      } else if (ruleType === 8) {
        const base = Math.floor(Math.random() * 6) + 2;
        const mult = base * (Math.floor(Math.random() * 5) + 2);
        const wrongSet = new Set<number>();
        while (wrongSet.size < 3) {
          const w = mult + Math.floor(Math.random() * 10) - 5;
          if (w > 0 && w % base !== 0) wrongSet.add(w);
        }
        const wrongs = Array.from(wrongSet).map(n => n.toString());
        rObj = {
          rule: `Tap numbers divisible by ${base}`,
          desc: `Select the multiple of ${base}`,
          correct: mult.toString(),
          options: [mult.toString(), ...wrongs].sort(() => Math.random() - 0.5)
        };
      } else {
        const color = COLOR_EMOJIS[Math.floor(Math.random() * COLOR_EMOJIS.length)];
        const opts = [...COLOR_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 4);
        if (!opts.includes(color)) opts[0] = color;
        rObj = {
          rule: `⚡ RULE SWITCH! Tap ${color}`,
          desc: "Fast Rule Shift: React to new color target",
          correct: color,
          options: opts.sort(() => Math.random() - 0.5)
        };
      }

      setRuleSwitchCurrent(rObj);
    } else if (gameId === "sequence_memory") {
      setSequenceUser([]);
      setSequencePhase("preview");
      setActiveSeqIndex(null);
      const seqSymbols = ["🟦", "🟢", "🔴", "🟡", "🟣", "🟧", "⭐", "💎"];
      const targetLen = Math.min(level + round + 1, 9);
      const generatedSeq: string[] = [];
      for (let i = 0; i < targetLen; i++) {
        generatedSeq.push(seqSymbols[Math.floor(Math.random() * seqSymbols.length)]);
      }
      setSequenceTarget(generatedSeq);

      generatedSeq.forEach((_, idx) => {
        setTimeout(() => {
          setActiveSeqIndex(idx);
        }, idx * 550);
      });

      setTimeout(() => {
        setActiveSeqIndex(null);
        setSequencePhase("recall");
      }, targetLen * 550 + 350);
    } else if (gameId === "word_scramble") {
      setUnscrambleInput("");
      const ACADEMIC_WORDS_BANK = [
        { word: "ALGORITHM", clue: "Step-by-step procedure for solving problems" },
        { word: "SYNTAX", clue: "Structure and rules of programming language code" },
        { word: "EQUATION", clue: "Mathematical statement showing two expressions are equal" },
        { word: "PHOTOSYNTHESIS", clue: "Process plants use to convert light into energy" },
        { word: "RECURSION", clue: "Function calling itself to solve smaller instances" },
        { word: "DERIVATIVE", clue: "Rate of change of a mathematical function" },
        { word: "HYPOTHESIS", clue: "Proposed explanation made on limited evidence" },
        { word: "QUANTUM", clue: "Minimum quantity of energy in physics" },
        { word: "VARIABLES", clue: "Symbols representing changeable data values" },
        { word: "CELLULAR", clue: "Relating to or consisting of living cells" },
        { word: "DATABASE", clue: "Organized collection of structured information" },
        { word: "POLYNOMIAL", clue: "Expression consisting of variables and coefficients" },
        { word: "MOMENTUM", clue: "Quantity of motion of a moving body" },
        { word: "ENZYME", clue: "Biological catalyst that speeds up reactions" },
        { word: "GENETICS", clue: "Study of heredity and variation of organisms" },
        { word: "CATALYST", clue: "Substance that increases rate of chemical reaction" },
        { word: "SOLUTION", clue: "Liquid mixture in which minor component is dissolved" },
        { word: "VECTORS", clue: "Quantities having direction as well as magnitude" },
        { word: "ECOLOGY", clue: "Branch of biology dealing with organisms & environment" },
        { word: "ELECTRON", clue: "Subatomic particle with negative electricity" },
        { word: "THEOREM", clue: "Statement proven based on previously established statements" },
        { word: "SPECTRUM", clue: "Band of colors produced by light separation" },
        { word: "NEWTON", clue: "Unit of force named after famous physicist" },
        { word: "GRAPH", clue: "Diagram showing relation between variable quantities" },
        { word: "MATRICES", clue: "Rectangular arrays of numbers arranged in rows & columns" },
        { word: "INTEGRAL", clue: "Calculates total area under a mathematical curve" },
        { word: "FRICTION", clue: "Resistance encountered moving over a surface" },
        { word: "KINETIC", clue: "Relating to or resulting from motion" },
        { word: "BIOLOGY", clue: "Scientific study of life and living organisms" },
        { word: "CHEMISTRY", clue: "Science dealing with substances and reactions" },
        { word: "GRAVITY", clue: "Force attracting bodies towards the Earth's center" },
        { word: "NEURON", clue: "Brain cell processing and transmitting information" },
        { word: "PROBABILITY", clue: "Extent to which an event is likely to occur" },
        { word: "OSMOSIS", clue: "Molecules passing through semipermeable membrane" },
        { word: "COMPILER", clue: "Translates code into executable machine instructions" },
        { word: "POINTER", clue: "Variable storing memory address of another value" },
        { word: "CIRCUIT", clue: "Closed path through which electric current flows" },
        { word: "DYNAMICS", clue: "Forces that cause movement in physical systems" },
        { word: "METABOLISM", clue: "Chemical processes occurring within a living organism" },
        { word: "LOGARITHM", clue: "Power to which a number must be raised to get another" }
      ];
      const randomIdx = Math.floor(Math.random() * ACADEMIC_WORDS_BANK.length);
      const wObj = ACADEMIC_WORDS_BANK[randomIdx];
      const scrambled = wObj.word.split('').sort(() => Math.random() - 0.5).join(' ');
      setWordScrambleCurrent({ word: wObj.word, clue: wObj.clue, scrambled });
    } else if (gameId === "dual_task") {
      setDualTaskUserSelected([]);
      const rndType = Math.floor(Math.random() * 4);
      let dObj: any = {};

      if (rndType === 0) {
        const evens = Array.from({ length: 20 }, (_, i) => (i + 1) * 2).filter(n => !n.toString().includes("3")).sort(() => Math.random() - 0.5).slice(0, 3);
        const badEvens = Array.from({ length: 20 }, (_, i) => (i + 1) * 2).filter(n => n.toString().includes("3")).sort(() => Math.random() - 0.5).slice(0, 1);
        const odds = Array.from({ length: 20 }, (_, i) => i * 2 + 1).sort(() => Math.random() - 0.5).slice(0, 2);

        let counter = 1;
        const items = [
          ...evens.map((n) => ({ id: counter++, val: n.toString(), isCorrect: true })),
          ...badEvens.map((n) => ({ id: counter++, val: n.toString(), isCorrect: false })),
          ...odds.map((n) => ({ id: counter++, val: n.toString(), isCorrect: false }))
        ].sort(() => Math.random() - 0.5);

        dObj = {
          rule1: "Rule 1: Tap EVEN numbers",
          rule2: "Rule 2: Never tap numbers containing 3",
          items
        };
      } else if (rndType === 1) {
        const shapes = ["Square", "Triangle", "Star", "Hexagon", "Diamond"];
        const colors = ["🟢", "🔴", "🔵", "🟡", "🟣"];
        const generatedItems: any[] = [];
        let counter = 1;

        for (let i = 0; i < 3; i++) {
          const shape = shapes[Math.floor(Math.random() * shapes.length)];
          generatedItems.push({ id: counter++, val: `🟢 ${shape}`, isCorrect: true });
        }
        generatedItems.push({ id: counter++, val: "🟢 Circle", isCorrect: false });
        for (let i = 0; i < 2; i++) {
          const c = colors.filter(col => col !== "🟢")[Math.floor(Math.random() * 4)];
          const s = shapes[Math.floor(Math.random() * shapes.length)];
          generatedItems.push({ id: counter++, val: `${c} ${s}`, isCorrect: false });
        }

        dObj = {
          rule1: "Rule 1: Tap GREEN items 🟢",
          rule2: "Rule 2: Ignore CIRCLES",
          items: generatedItems.sort(() => Math.random() - 0.5)
        };
      } else if (rndType === 2) {
        const threshold = (Math.floor(Math.random() * 4) + 2) * 10;
        const validOdds = [threshold + 3, threshold + 7, threshold + 11, threshold + 15].sort(() => Math.random() - 0.5).slice(0, 3);
        const badEvens = [threshold + 2, threshold + 6, threshold + 10].sort(() => Math.random() - 0.5).slice(0, 1);
        const lowNums = [threshold - 5, threshold - 9].sort(() => Math.random() - 0.5).slice(0, 2);

        let counter = 1;
        const items = [
          ...validOdds.map(n => ({ id: counter++, val: n.toString(), isCorrect: true })),
          ...badEvens.map(n => ({ id: counter++, val: n.toString(), isCorrect: false })),
          ...lowNums.map(n => ({ id: counter++, val: n.toString(), isCorrect: false }))
        ].sort(() => Math.random() - 0.5);

        dObj = {
          rule1: `Rule 1: Tap numbers > ${threshold}`,
          rule2: "Rule 2: Ignore EVEN numbers",
          items
        };
      } else {
        const validBlues = [12, 24, 38, 46, 72, 84].sort(() => Math.random() - 0.5).slice(0, 3);
        const badBlue5 = [25, 35, 54, 58].sort(() => Math.random() - 0.5).slice(0, 1);
        const redOthers = [14, 28, 62].sort(() => Math.random() - 0.5).slice(0, 2);

        let counter = 1;
        const items = [
          ...validBlues.map(n => ({ id: counter++, val: `🔵 ${n}`, isCorrect: true })),
          ...badBlue5.map(n => ({ id: counter++, val: `🔵 ${n}`, isCorrect: false })),
          ...redOthers.map(n => ({ id: counter++, val: `🔴 ${n}`, isCorrect: false }))
        ].sort(() => Math.random() - 0.5);

        dObj = {
          rule1: "Rule 1: Tap BLUE symbols 🔵",
          rule2: "Rule 2: Never tap numbers containing digit 5",
          items
        };
      }
      setDualTaskCurrent(dObj);
    }
  };

  // Study Plan States
  const [activeStudyPlan, setActiveStudyPlan] = useState<any>(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planSubject, setPlanSubject] = useState("");
  const [planTopic, setPlanTopic] = useState("");
  const [planDifficulty, setPlanDifficulty] = useState("Medium");
  const [planTargetDate, setPlanTargetDate] = useState("");
  const [planDailyMinutes, setPlanDailyMinutes] = useState(60);
  const [planIsGenerating, setPlanIsGenerating] = useState(false);

  // Load study plan from localStorage on mount
  useEffect(() => {
    if (user) {
      const key = `quicksolv_study_plan_${user.id || user.email}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setActiveStudyPlan(JSON.parse(saved));
        } catch {}
      }
    }
  }, [user]);

  // Load API keys from localStorage on mount
  useEffect(() => {
    const gk = localStorage.getItem("quicksolv_gemini_api_key") || "";
    const ok = localStorage.getItem("quicksolv_openrouter_api_key") || "";
    setGeminiApiKey(gk);
    setOpenRouterApiKey(ok);
  }, []);

  // Pre-populated Quiz History matching the exact list in user screenshot
  const [quizHistory, setQuizHistory] = useState<any[]>([
    {
      id: "q-newton",
      title: "Newton's Laws of Motion",
      subject: "Physics",
      questionsCount: 10,
      difficulty: "Easy",
      score: "8/10",
      createdOn: "12 May, 2025",
      icon: "book",
      questions: [
        { question: "A body remains at rest or in uniform motion unless acted upon by an external force. This is Newton's:", options: ["First Law", "Second Law", "Third Law", "Universal Law of Gravitation"], correct_answer: "First Law", explanation: "Newton's First Law (Law of Inertia) states that objects resist changes to their state of motion." },
        { question: "Which formula represents Newton's Second Law of Motion?", options: ["F = ma", "E = mc^2", "V = IR", "P = mv"], correct_answer: "F = ma", explanation: "Newton's Second Law defines force as the product of mass and acceleration (F = ma)." },
        { question: "For every action, there is an equal and opposite reaction. This is Newton's:", options: ["First Law", "Second Law", "Third Law", "Law of Inertia"], correct_answer: "Third Law", explanation: "Newton's Third Law states that forces always occur in equal and opposite pairs." },
        { question: "What is the SI unit of force?", options: ["Joule", "Watt", "Pascal", "Newton"], correct_answer: "Newton", explanation: "The unit of force is named the Newton (N) in honor of Sir Isaac Newton." },
        { question: "Inertia is directly proportional to an object's:", options: ["Velocity", "Mass", "Acceleration", "Volume"], correct_answer: "Mass", explanation: "Mass is the quantitative measure of inertia. A more massive object has more inertia." },
        { question: "A passenger in a bus leans forward when the bus stops suddenly due to:", options: ["Inertia of rest", "Inertia of motion", "Inertia of direction", "Gravitational pull"], correct_answer: "Inertia of motion", explanation: "The passenger's upper body continues to move forward due to the inertia of motion." },
        { question: "If the force acting on an object is doubled while its mass is kept constant, what happens to the acceleration?", options: ["It is halved", "It remains the same", "It is doubled", "It is quadrupled"], correct_answer: "It is doubled", explanation: "Since F = ma, acceleration is directly proportional to force. Doubling force doubles acceleration." },
        { question: "Which of the following is a contact force?", options: ["Gravitational force", "Magnetic force", "Frictional force", "Electrostatic force"], correct_answer: "Frictional force", explanation: "Frictional force requires physical contact between surfaces, unlike action-at-a-distance forces." },
        { question: "A book sitting on a table has a net force of:", options: ["9.8 N", "Mass x 9.8 N", "Zero", "Dependent on gravity"], correct_answer: "Zero", explanation: "Since the book is at rest, the forces acting on it (gravity downward, normal force upward) are balanced, resulting in a net force of zero." },
        { question: "According to Newton's Third Law, action and reaction forces act on:", options: ["The same body", "Different bodies in opposite directions", "Different bodies in the same direction", "No bodies at all"], correct_answer: "Different bodies in opposite directions", explanation: "Action-reaction pairs always act on two different objects in opposite directions." }
      ]
    },
    {
      id: "q-dbms",
      title: "DBMS Normalization",
      subject: "Computer Science",
      questionsCount: 12,
      difficulty: "Medium",
      score: "7/12",
      createdOn: "10 May, 2025",
      icon: "database",
      questions: [
        { question: "Which normal form eliminates partial dependencies?", options: ["1NF", "2NF", "3NF", "BCNF"], correct_answer: "2NF", explanation: "2NF requires the relation to be in 1NF and all non-key attributes to be fully functionally dependent on the primary key." },
        { question: "Which normal form requires the elimination of transitive dependencies?", options: ["1NF", "2NF", "3NF", "BCNF"], correct_answer: "3NF", explanation: "3NF is violated if there is a transitive dependency (a non-prime attribute determining another non-prime attribute)." },
        { question: "A relation is in 1NF if and only if all underlying domains contain only:", options: ["Atomic values", "Multivalued attributes", "Composite values", "Repeating groups"], correct_answer: "Atomic values", explanation: "1NF requires that all values in a table are atomic (indivisible)." },
        { question: "Boyce-Codd Normal Form (BCNF) is a stronger version of:", options: ["1NF", "2NF", "3NF", "BCNF"], correct_answer: "3NF", explanation: "BCNF is stronger than 3NF. A table is in BCNF if for every functional dependency X -> Y, X is a superkey." },
        { question: "Lossless join decomposition is a property that ensures:", options: ["No tuples are lost when tables are joined back", "No redundant attributes are created", "No constraints are violated", "The database size is minimized"], correct_answer: "No tuples are lost when tables are joined back", explanation: "Lossless join decomposition guarantees that joining the decomposed tables reconstructs the original table exactly." },
        { question: "Which dependency is resolved by 4NF?", options: ["Partial dependency", "Transitive dependency", "Multivalued dependency", "Join dependency"], correct_answer: "Multivalued dependency", explanation: "Fourth Normal Form (4NF) addresses multivalued dependencies (MVD)." },
        { question: "If attribute A determines attribute B, and attribute B determines attribute C, then A determines C. This rule is called:", options: ["Reflexivity", "Augmentation", "Transitivity", "Union"], correct_answer: "Transitivity", explanation: "Transitivity is one of Armstrong's axioms: if A -> B and B -> C, then A -> C." }
      ]
    },
    {
      id: "q-quadratic",
      title: "Quadratic Equations",
      subject: "Mathematics",
      questionsCount: 8,
      difficulty: "Easy",
      score: "6/8",
      createdOn: "8 May, 2025",
      icon: "math",
      questions: [
        { question: "What is the general form of a quadratic equation?", options: ["ax + b = 0", "ax^2 + bx + c = 0", "ax^3 + bx^2 + cx + d = 0", "y = mx + c"], correct_answer: "ax^2 + bx + c = 0", explanation: "A quadratic equation is a second-order polynomial equation in a single variable." },
        { question: "The discriminant of a quadratic equation ax^2 + bx + c = 0 is:", options: ["b^2 - 4ac", "b^2 + 4ac", "4ac - b^2", "-b ± √D"], correct_answer: "b^2 - 4ac", explanation: "The discriminant D is calculated as b^2 - 4ac." },
        { question: "If the discriminant D > 0, the roots of the equation are:", options: ["Real and distinct", "Real and equal", "Imaginary/Complex", "Undefined"], correct_answer: "Real and distinct", explanation: "When the discriminant is positive, the square root term is real and non-zero, yielding two distinct real roots." },
        { question: "If the discriminant D = 0, the roots are:", options: ["Real and distinct", "Real and equal", "Imaginary/Complex", "Zero"], correct_answer: "Real and equal", explanation: "When D = 0, the root formula simplifies to -b / 2a, producing a single repeated real root." },
        { question: "What are the roots of the quadratic equation x^2 - 5x + 6 = 0?", options: ["x = 2, 3", "x = -2, -3", "x = 1, 5", "x = 0, 6"], correct_answer: "x = 2, 3", explanation: "Factoring yields (x - 2)(x - 3) = 0, so the roots are x = 2 and x = 3." },
        { question: "The sum of the roots of a quadratic equation ax^2 + bx + c = 0 is equal to:", options: ["c/a", "-b/a", "b/a", "-c/a"], correct_answer: "-b/a", explanation: "According to Vieta's formulas, the sum of roots is -b/a." },
        { question: "The product of the roots of a quadratic equation ax^2 + bx + c = 0 is equal to:", options: ["c/a", "-b/a", "b/a", "-c/a"], correct_answer: "c/a", explanation: "According to Vieta's formulas, the product of roots is c/a." },
        { question: "For an equation x^2 + 4x + 4 = 0, the discriminant is:", options: ["16", "0", "-16", "8"], correct_answer: "0", explanation: "D = 4^2 - 4(1)(4) = 16 - 16 = 0." }
      ]
    },
    {
      id: "q-photo",
      title: "Photosynthesis Process",
      subject: "Biology",
      questionsCount: 10,
      difficulty: "Medium",
      score: "9/10",
      createdOn: "6 May, 2025",
      icon: "leaf",
      questions: [
        { question: "Which pigment is primary in capturing light energy for photosynthesis?", options: ["Chlorophyll a", "Chlorophyll b", "Carotenoid", "Xanthophyll"], correct_answer: "Chlorophyll a", explanation: "Chlorophyll a is the primary pigment involved in photosynthesis, absorbing blue-violet and red light." },
        { question: "The light-dependent reactions of photosynthesis occur in the:", options: ["Stroma", "Thylakoid membrane", "Mitochondria", "Cytoplasm"], correct_answer: "Thylakoid membrane", explanation: "Light-dependent reactions occur in the thylakoid membrane where photosystems I and II reside." },
        { question: "The light-independent reactions (Calvin Cycle) occur in the:", options: ["Thylakoid space", "Stroma", "Outer membrane", "Stomata"], correct_answer: "Stroma", explanation: "The Calvin Cycle occurs in the stroma of the chloroplast where ATP and NADPH fix carbon dioxide." },
        { question: "Which gas is released as a byproduct during the light reactions of photosynthesis?", options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Water Vapor"], correct_answer: "Oxygen", explanation: "Oxygen is produced from the photolysis (splitting) of water molecules." },
        { question: "The splitting of water molecules during light reactions is known as:", options: ["Hydrolysis", "Photolysis", "Glycolysis", "Phosphorylation"], correct_answer: "Photolysis", explanation: "Photolysis is the chemical decomposition of water induced by light." }
      ]
    },
    {
      id: "q-java",
      title: "Java OOPs Concepts",
      subject: "Computer Science",
      questionsCount: 15,
      difficulty: "Hard",
      score: "10/15",
      createdOn: "4 May, 2025",
      icon: "code",
      questions: [
        { question: "Which OOP concept is illustrated by hiding internal details and showing functionality?", options: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"], correct_answer: "Abstraction", explanation: "Abstraction is the process of hiding execution details and showing only key features to the user." },
        { question: "Which OOP concept restricts direct access to a class's fields using private modifiers?", options: ["Abstraction", "Encapsulation", "Polymorphism", "Inheritance"], correct_answer: "Encapsulation", explanation: "Encapsulation keeps variables private and exposes public getter/setter methods." },
        { question: "Java supports multiple inheritance of classes through:", options: ["Abstract classes", "Extends keyword", "Interfaces", "It is not supported in any form"], correct_answer: "Interfaces", explanation: "Multiple inheritance is not supported directly for classes to prevent ambiguity (diamond problem), but is supported via multiple interfaces." },
        { question: "Method Overloading is an example of:", options: ["Compile-time Polymorphism", "Runtime Polymorphism", "Dynamic Binding", "Inheritance"], correct_answer: "Compile-time Polymorphism", explanation: "Method overloading resolved at compilation is compile-time (static) polymorphism." },
        { question: "Method Overriding is an example of:", options: ["Compile-time Polymorphism", "Runtime Polymorphism", "Static Binding", "Encapsulation"], correct_answer: "Runtime Polymorphism", explanation: "Method overriding resolved during execution is runtime (dynamic) polymorphism." }
      ]
    }
  ]);

  // Auto-purge old mock database versions to clear cached old template conversations
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dbVersion = localStorage.getItem("quicksolv_db_version");
      if (dbVersion !== "3") {
        localStorage.removeItem("snaptutor_mock_db");
        localStorage.setItem("quicksolv_db_version", "3");
        window.location.reload();
      }
    }
  }, []);

  // Load saved quiz state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAnswers = localStorage.getItem("quicksolv_quiz_answers");
      const savedSubmissions = localStorage.getItem("quicksolv_quiz_submissions");
      if (savedAnswers) {
        try {
          setSelectedQuizAnswers(JSON.parse(savedAnswers));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedSubmissions) {
        try {
          setSubmittedQuizzes(JSON.parse(savedSubmissions));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Load saved quizHistory from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedQuizHistory = localStorage.getItem("quicksolv_quiz_history");
      if (savedQuizHistory) {
        try {
          setQuizHistory(JSON.parse(savedQuizHistory));
        } catch (e) {
          console.error("Failed to parse quiz history:", e);
        }
      }
    }
  }, []);

  // Save quizHistory to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && quizHistory.length > 0) {
      localStorage.setItem("quicksolv_quiz_history", JSON.stringify(quizHistory));
    }
  }, [quizHistory]);

  // Load user session
  useEffect(() => {
    const fetchUser = async () => {
      if (isConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUser(data.session.user);
        }
      } else {
        const saved = localStorage.getItem("snaptutor_user");
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          // Default mock user profile matching screenshot ("Ananya Kumar")
          const defaultUser = {
            id: "demo-user-123",
            email: "ananya.kumar@quicksolv.edu",
            name: "Ananya Kumar"
          };
          localStorage.setItem("snaptutor_user", JSON.stringify(defaultUser));
          setUser(defaultUser);
        }
      }
    };
    fetchUser();
  }, [isConfigured]);

  // Load user profile from localStorage
  useEffect(() => {
    if (user) {
      const savedProfile = localStorage.getItem(`quicksolv_profile_${user.id || user.email}`);
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      } else {
        // Start with empty profile info as requested, except JoinedOn and Avatar default
        setProfileData({
          fullName: "",
          emailAddress: "",
          phoneNumber: "",
          dob: "",
          gender: "",
          location: "",
          aboutMe: "",
          joinedOn: "Joined on 24 May, 2025",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"
        });
      }
    }
  }, [user]);

  // Helper date generators for local calendar timezone (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Authoritative Streak Loader (Local Storage + DB Service Sync across devices)
  const loadUserStreak = async (currentUser: any) => {
    const userId = currentUser?.id || currentUser?.email || "guest_user";
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    // 1. Fetch remote user streak from Supabase / DB Service
    let remoteStreak = { streak_count: 0, streak_last_date: "", streak_history: [] as string[] };
    try {
      remoteStreak = await dbService.getUserStreak(userId);
    } catch (err) {
      console.warn("Could not load streak from DB:", err);
    }

    // 2. Fetch local storage values
    const localCountRaw = localStorage.getItem(`quicksolv_streak_count_${userId}`) || localStorage.getItem("quicksolv_streak_count");
    const localCount = localCountRaw !== null ? parseInt(localCountRaw, 10) : 0;
    const localLastDate = localStorage.getItem(`quicksolv_streak_last_date_${userId}`) || localStorage.getItem("quicksolv_streak_last_date") || "";
    let localHistory: string[] = [];
    try {
      const savedHist = localStorage.getItem(`quicksolv_streak_${userId}`);
      if (savedHist) localHistory = JSON.parse(savedHist);
    } catch {}

    // 3. Resolve most accurate count, last date & history
    let count = Math.max(remoteStreak.streak_count || 0, isNaN(localCount) ? 0 : localCount);
    let lastDate = remoteStreak.streak_last_date || localLastDate || "";
    let history = remoteStreak.streak_history.length >= localHistory.length ? remoteStreak.streak_history : localHistory;

    // 4. Consecutive Day Validation Logic
    if (lastDate === todayStr) {
      // Already active today! Keep streak count
      if (count < 1 && (history.includes(todayStr) || localCount > 0)) count = Math.max(1, localCount);
    } else if (lastDate === yesterdayStr) {
      // Active yesterday! Streak intact, pending today's task completion to increment to next day!
      if (count < 1) count = Math.max(1, localCount);
    } else if (lastDate && lastDate < yesterdayStr) {
      // Gap of 2+ days: streak broken due to inactivity! Reset to 0 (until new task completed today)
      count = 0;
    } else if (!lastDate) {
      if (count > 0 && history.length > 0) {
        lastDate = history[history.length - 1];
        if (lastDate < yesterdayStr) count = 0;
      }
    }

    // 5. Update React States
    setStreakCount(count);
    setStreakLastDate(lastDate);
    setStreakHistory(history);

    // 6. Sync back to local storage & DB
    localStorage.setItem(`quicksolv_streak_count_${userId}`, count.toString());
    localStorage.setItem("quicksolv_streak_count", count.toString());
    localStorage.setItem(`quicksolv_streak_last_date_${userId}`, lastDate);
    localStorage.setItem("quicksolv_streak_last_date", lastDate);
    localStorage.setItem(`quicksolv_streak_${userId}`, JSON.stringify(history));

    if (userId !== "guest_user") {
      dbService.saveUserStreak(userId, count, lastDate, history);
    }
  };

  // Trigger streak loading whenever user authentication state loads/changes
  useEffect(() => {
    loadUserStreak(user);
  }, [user]);

  // Real-Time Streak Recorder (Called when completing a task, game level, or daily quiz)
  const recordStreakProgress = async () => {
    const userId = user?.id || user?.email || "guest_user";
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    let newCount = streakCount;
    let newHistory = [...streakHistory];

    if (streakLastDate !== todayStr) {
      if (streakLastDate === yesterdayStr) {
        // Active yesterday -> Consecutive day! Increment streak (1 -> 2, 2 -> 3, etc.)
        newCount = (streakCount >= 1 ? streakCount : 1) + 1;
      } else {
        // First task ever or after broken streak -> Start 1 Day streak
        newCount = 1;
      }
      if (!newHistory.includes(todayStr)) {
        newHistory.push(todayStr);
      }
      setStreakEarnedNewToday(true);
    } else {
      // Already completed a task today, retain current valid streak count
      if (newCount < 1) newCount = 1;
      setStreakEarnedNewToday(false);
    }

    setStreakCount(newCount);
    setStreakLastDate(todayStr);
    setStreakHistory(newHistory);

    // Save to LocalStorage
    localStorage.setItem(`quicksolv_streak_count_${userId}`, newCount.toString());
    localStorage.setItem("quicksolv_streak_count", newCount.toString());
    localStorage.setItem(`quicksolv_streak_last_date_${userId}`, todayStr);
    localStorage.setItem("quicksolv_streak_last_date", todayStr);
    localStorage.setItem(`quicksolv_streak_${userId}`, JSON.stringify(newHistory));

    // Save to DB Service / Supabase across devices
    await dbService.saveUserStreak(userId, newCount, todayStr, newHistory);
  };

  const startDailyQuizCategory = async (category: string) => {
    setSelectedStreakCategory(category);
    setStreakModalView("loading");
    setStreakQuizIsLoading(true);
    
    const localGeminiKey = localStorage.getItem("quicksolv_gemini_api_key") || "";
    const localOpenRouterKey = localStorage.getItem("quicksolv_openrouter_api_key") || "";
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "quiz-generate",
          topic: category,
          difficulty: "Medium",
          numQuestions: 5,
          userId: user?.id || "demo-user-123",
          userGeminiKey: localGeminiKey,
          userOpenRouterKey: localOpenRouterKey
        })
      });
      const data = await response.json();
      if (data.success && data.quiz) {
        setStreakQuiz(data.quiz);
        setStreakQuizAnswers({});
        setStreakQuizCurrentIndex(0);
        setStreakQuizScore(0);
        setStreakModalView("playing");
      } else {
        alert("Failed to load daily quiz: " + (data.error || "Unknown error"));
        setStreakModalView("categories");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate quiz due to network error.");
      setStreakModalView("categories");
    } finally {
      setStreakQuizIsLoading(false);
    }
  };

  const handleStreakQuizSubmit = () => {
    if (!streakQuiz) return;
    
    let finalScore = 0;
    streakQuiz.questions.forEach((q: any, idx: number) => {
      const ans = streakQuizAnswers[idx];
      if (ans && ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
        finalScore++;
      }
    });
    
    const todayStr = new Date().toISOString().substring(0, 10);
    const userId = user?.id || user?.email || "demo-user-123";
    const key = `quicksolv_streak_${userId}`;
    const saved = localStorage.getItem(key);
    let history: string[] = [];
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch {}
    }
    const alreadyHadToday = history.includes(todayStr);
    
    setStreakQuizScore(finalScore);
    
    // Increment streak
    recordStreakProgress();
    
    setStreakEarnedNewToday(!alreadyHadToday);
    
    // Save to general history list so it appears in the quiz tab with "completed done"
    const newQuizItem = {
      id: `q-streak-${Date.now()}`,
      title: `${selectedStreakCategory} Daily Streak Challenge`,
      subject: selectedStreakCategory,
      questionsCount: streakQuiz.questions.length,
      difficulty: "Medium",
      score: `${finalScore}/${streakQuiz.questions.length}`,
      createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      icon: "award"
    };
    setQuizHistory(prev => [newQuizItem, ...prev]);

    setStreakModalView("score");
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setPrompt("");
    setAttachedImage(null);
    setAttachedImageMime(null);
  };

  const handleGenerateStudyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planSubject.trim() || !planTopic.trim() || !planTargetDate) {
      alert("Please fill in all required fields.");
      return;
    }

    const localGeminiKey = localStorage.getItem("quicksolv_gemini_api_key") || "";
    const localOpenRouterKey = localStorage.getItem("quicksolv_openrouter_api_key") || "";

    setPlanIsGenerating(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "study-plan-generate",
          subject: planSubject,
          topic: planTopic,
          difficulty: planDifficulty,
          userId: user?.id || "demo-user-123",
          userGeminiKey: localGeminiKey,
          userOpenRouterKey: localOpenRouterKey
        })
      });

      const data = await response.json();
      if (data.success && data.plan) {
        const fullPlan = {
          id: `plan_${Date.now()}`,
          subject: planSubject,
          topic: planTopic,
          targetDate: planTargetDate,
          dailyMinutes: planDailyMinutes,
          difficulty: planDifficulty,
          progress: 0,
          days: data.plan.days.map((d: any) => ({
            ...d,
            tasks: d.tasks.map((t: any) => ({ ...t, completed: false }))
          }))
        };

        const key = `quicksolv_study_plan_${user?.id || user?.email || "demo-user-123"}`;
        localStorage.setItem(key, JSON.stringify(fullPlan));
        setActiveStudyPlan(fullPlan);
        setShowCreatePlanModal(false);
        
        // Reset form
        setPlanSubject("");
        setPlanTopic("");
        setPlanTargetDate("");
      } else {
        alert("Failed to generate study plan: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error, please try again.");
    } finally {
      setPlanIsGenerating(false);
    }
  };

  const toggleStudyPlanTask = (dayNum: number, taskId: string) => {
    if (!activeStudyPlan) return;

    const updatedDays = activeStudyPlan.days.map((d: any) => {
      if (d.dayNum === dayNum) {
        return {
          ...d,
          tasks: d.tasks.map((t: any) => {
            if (t.id === taskId) {
              return { ...t, completed: !t.completed };
            }
            return t;
          })
        };
      }
      return d;
    });

    // Calculate new progress percentage
    let totalTasks = 0;
    let completedTasks = 0;
    updatedDays.forEach((d: any) => {
      d.tasks.forEach((t: any) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });

    const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

    const updatedPlan = {
      ...activeStudyPlan,
      days: updatedDays,
      progress
    };

    const key = `quicksolv_study_plan_${user?.id || user?.email || "demo-user-123"}`;
    localStorage.setItem(key, JSON.stringify(updatedPlan));
    setActiveStudyPlan(updatedPlan);
  };

  const handleDeleteStudyPlan = () => {
    if (!confirm("Are you sure you want to delete your current study plan?")) return;
    const key = `quicksolv_study_plan_${user?.id || user?.email || "demo-user-123"}`;
    localStorage.removeItem(key);
    setActiveStudyPlan(null);
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 18 || hours < 6) {
      return "It's a late-night study session.";
    } else if (hours >= 6 && hours < 12) {
      return "Ready for a morning study review?";
    } else {
      return "Good afternoon study session.";
    }
  };

  // Load initial workspace data (conversations, saved answers, limits)
  useEffect(() => {
    if (!user) return;
    
    const loadWorkspaceData = async () => {
      try {
        const convs = await dbService.getConversations(user.id || user.email);
        setConversations(convs);

        const saved = await dbService.getSavedAnswers(user.id || user.email);
        setSavedAnswers(saved);

        const usage = await dbService.checkUsageLimit(user.id || user.email);
        setUsageLimit(usage);
      } catch (err) {
        console.error("Workspace loading failed:", err);
      }
    };
    loadWorkspaceData();
  }, [user, activeConvId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setStreamingMessageId(null);
    setStreamingText("");

    if (!activeConvId) return;
    
    const loadMessages = async () => {
      try {
        const msgs = await dbService.getMessages(activeConvId);
        setMessages(msgs);
        
        setQuizScores({ score: 0, total: 0 });
      } catch (err) {
        console.error("Messages load failed:", err);
      }
    };
    loadMessages();
  }, [activeConvId]);

  // Render LaTeX math delimiters defensively
  const renderMathText = (text: string | undefined): string => {
    if (!text) return "";
    return text
      .replace(/\\\[/g, '<div class="math-block overflow-x-auto my-3 font-mono text-[#4A2711] text-center bg-[#FAF6F0] p-2.5 rounded-lg border border-[#EADDC9]/50">')
      .replace(/\\\]/g, "</div>")
      .replace(/\\\(/g, '<span class="math-inline font-mono text-[#4A2711] bg-[#FAF6F0] px-1.5 py-0.5 rounded border border-[#EADDC9]/30">')
      .replace(/\\\)/g, "</span>")
      .replace(/\n/g, "<br />");
  };
  // Render LaTeX and Markdown tags securely to HTML
  const renderRichMarkdown = (text: string | undefined): { __html: string } => {
    if (!text) return { __html: "" };
    
    // Extract code blocks to placeholders to prevent styling corruption inside pre elements
    const codeBlocks: string[] = [];
    let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(code.trim());
      return `__CODE_BLOCK_PLACEHOLDER_${idx}__`;
    });

    html = html
      .replace(/\\\[/g, '$$$$')
      .replace(/\\\]/g, '$$$$')
      .replace(/\\\(/g, '$$')
      .replace(/\\\)/g, '$$');

    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Render block math $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      return `<div class="math-block my-3 p-3 bg-[#FAF6F0] border border-[#EADDC9]/30 rounded-xl text-center font-mono text-xs text-[#4A2711] overflow-x-auto">${math.trim()}</div>`;
    });

    // Render inline math $...$
    html = html.replace(/\$(.*?)\$/g, (match, math) => {
      return `<code class="math-inline px-1.5 py-0.5 bg-[#FAF6F0] border border-[#EADDC9]/30 rounded text-xs text-[#4A2711] font-mono">${math}</code>`;
    });

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-gray-50 border border-gray-150 rounded text-xs font-mono">$1</code>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-gray-950">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Lines & lists splitting
    const lines = html.split("\n");
    let inList = false;
    const parsedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemContent = trimmed.substring(2);
        let prefix = "";
        if (!inList) {
          inList = true;
          prefix = '<ul class="list-disc pl-5 my-2.5 space-y-1.5 text-gray-700">';
        }
        return `${prefix}<li class="leading-relaxed font-sans text-sm text-gray-800">${itemContent}</li>`;
      } else {
        let suffix = "";
        if (inList) {
          inList = false;
          suffix = '</ul>';
        }
        if (trimmed === "") {
          return `${suffix}<div class="h-2"></div>`;
        }
        if (trimmed.startsWith("__CODE_BLOCK_PLACEHOLDER_")) {
          return `${suffix}${line}`;
        }
        return `${suffix}<p class="leading-relaxed my-2 text-gray-800 font-sans text-sm">${line}</p>`;
      }
    });
    
    html = parsedLines.join("\n");
    if (inList) {
      html += '</ul>';
    }

    // Insert back code blocks with a clean header copy layout, crisp white font, and dark charcoal bg
    codeBlocks.forEach((code, idx) => {
      const codeHtml = `<div class="my-4 rounded-xl border border-gray-800 overflow-hidden shadow-md font-sans">
        <div class="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-850">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source Code</span>
          <button 
            type="button"
            onclick="navigator.clipboard.writeText(\`${code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)"
            class="text-[10px] font-bold text-gray-400 hover:text-white bg-gray-800 px-2 py-1 rounded transition select-none"
          >
            Copy Code
          </button>
        </div>
        <pre class="bg-[#1e1e1e] text-gray-100 p-5 font-mono text-[12.5px] overflow-x-auto leading-relaxed select-text" style="color: #f4f4f5 !important; background-color: #1e1e1e !important;">${code}</pre>
      </div>`;
      html = html.replace(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, codeHtml);
    });

    return { __html: html };
  };

  const handleLogout = async () => {
    if (isConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("snaptutor_user");
      localStorage.removeItem("snaptutor_mock_db");
    }
    setUser(null);
    setConversations([]);
    setMessages([]);
    setActiveConvId(null);
    router.push("/");
  };

  // Capture Image via Webcam
  const startCamera = async () => {
    setShowCamera(true);
    try {
      setTimeout(async () => {
        if (navigator.mediaDevices && videoRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      }, 300);
    } catch (err) {
      console.warn("Camera hardware access denied. Falling back to simulation.", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setAttachedImage(dataUrl.split(",")[1]);
        setAttachedImageMime("image/jpeg");
      }
      stream.getTracks().forEach(track => track.stop());
    } else {
      setAttachedImage("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
      setAttachedImageMime("image/png");
    }
    setShowCamera(false);
  };

  const cancelCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setErrorMessage("Please upload an image (PNG/JPG/WebP) or a PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setAttachedImage(base64Data);
      setAttachedImageMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const dataUrl = event.target.result as string;
              const commaIdx = dataUrl.indexOf(",");
              if (commaIdx !== -1) {
                const base64 = dataUrl.substring(commaIdx + 1);
                setAttachedImage(base64);
                setAttachedImageMime(file.type);
              }
            }
          };
          reader.readAsDataURL(file);
        }
        e.preventDefault();
        break;
      }
    }
  };

  // Save pinned section to library
  const saveSectionToLibrary = async (secName: string, title: string, subject: string, topic: string, data: any) => {
    if (!user) {
      router.push("/login?redirect=/chat");
      return;
    }

    try {
      await dbService.saveAnswer(
        user.id || user.email,
        title,
        subject,
        topic,
        { section: secName, value: data }
      );
      setSavedSection(secName);
      setTimeout(() => setSavedSection(null), 2000);
      
      const saved = await dbService.getSavedAnswers(user.id || user.email);
      setSavedAnswers(saved);
    } catch (err) {
      console.error("Failed to pin answer:", err);
    }
  };

  const copyToClipboard = (sectionKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Cancel active AI generation and stream
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setStreamingMessageId(null);
    setStreamingText("");
    setIsLoading(false);
  };

  // Helper to stream assistant conversational response word-by-word
  const streamAssistantResponse = (messageId: string, fullText: string, onComplete?: () => void) => {
    setStreamingMessageId(messageId);
    setStreamingText("");
    
    let currentIdx = 0;
    const words = fullText.split(" ");
    
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }
    
    streamingIntervalRef.current = setInterval(() => {
      if (currentIdx >= words.length) {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setStreamingMessageId(null);
        setStreamingText("");
        if (onComplete) onComplete();
        return;
      }
      
      setStreamingText((prev) => {
        const nextText = prev ? prev + " " + words[currentIdx] : words[currentIdx];
        currentIdx++;
        return nextText;
      });
    }, 25); // 25ms per word is smooth and rapid
  };

  // Trigger Send Message
  const handleSendMessage = async (e: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return; // Prevent duplicate rapid submissions
    
    const activePrompt = customPrompt || prompt;
    if (!activePrompt && !attachedImage) return;
    
    if (!user) {
      router.push(`/login?redirect=/chat`);
      return;
    }

    setErrorMessage(null);
    setDevConfigError(null);
    setIsLoading(true);

    try {
      let cleanPrompt = activePrompt;
      let finalMode = aiMode;
      
      const lowerPrompt = activePrompt.trim().toLowerCase();
      if (lowerPrompt.startsWith("/deep-research") || lowerPrompt.startsWith("/plan")) {
        finalMode = "research";
        if (lowerPrompt.startsWith("/deep-research")) {
          cleanPrompt = activePrompt.substring("/deep-research".length).trim();
        } else if (lowerPrompt.startsWith("/plan")) {
          cleanPrompt = activePrompt.substring("/plan".length).trim();
        }
      } else if (aiMode === "all-in-one") {
        if (lowerPrompt.includes("research") || lowerPrompt.includes("paper") || lowerPrompt.includes("citation")) {
          finalMode = "research";
        } else if (lowerPrompt.includes("quiz") || lowerPrompt.includes("test me") || lowerPrompt.includes("mcq") || lowerPrompt.includes("question paper")) {
          finalMode = "quiz";
        } else if (lowerPrompt.includes("notes") || lowerPrompt.includes("summary") || lowerPrompt.includes("revision") || lowerPrompt.includes("explain in simple words")) {
          finalMode = "notes";
        } else if (lowerPrompt.includes("code") || lowerPrompt.includes("debug") || lowerPrompt.includes("compile") || lowerPrompt.includes("bug") || lowerPrompt.includes("refactor") || lowerPrompt.includes("program")) {
          finalMode = "coding";
        } else if (lowerPrompt.includes("math") || lowerPrompt.includes("equation") || lowerPrompt.includes("solve") || lowerPrompt.includes("calculation") || lowerPrompt.includes("calculate") || lowerPrompt.includes("fraction")) {
          finalMode = "math";
        } else if (lowerPrompt.includes("compare") || lowerPrompt.includes("versus") || lowerPrompt.includes("vs ") || lowerPrompt.includes("difference between")) {
          finalMode = "comparison";
        } else if (lowerPrompt.includes("how to") || lowerPrompt.includes("step by step") || lowerPrompt.includes("guide") || lowerPrompt.includes("manual") || lowerPrompt.includes("instructions")) {
          finalMode = "how_to";
        } else if (lowerPrompt.includes("ppt") || lowerPrompt.includes("slide") || lowerPrompt.includes("presentation") || lowerPrompt.includes("pitch deck") || lowerPrompt.includes("hackathon") || lowerPrompt.includes("mvp") || lowerPrompt.includes("project")) {
          finalMode = "hackathon";
        } else if (lowerPrompt.includes("business") || lowerPrompt.includes("startup") || lowerPrompt.includes("market") || lowerPrompt.includes("competitor") || lowerPrompt.includes("revenue") || lowerPrompt.includes("pricing")) {
          finalMode = "business";
        } else if (lowerPrompt.includes("career") || lowerPrompt.includes("interview") || lowerPrompt.includes("resume") || lowerPrompt.includes("job") || lowerPrompt.includes("linkedin")) {
          finalMode = "career";
        }
      }

      const localGeminiKey = localStorage.getItem("quicksolv_gemini_api_key") || "";
      const localOpenRouterKey = localStorage.getItem("quicksolv_openrouter_api_key") || "";

      const currentRequestId = "req_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const isPdf = attachedImageMime === "application/pdf";
      const requestPayload = {
        prompt: cleanPrompt,
        mode: finalMode,
        image: (!isPdf && attachedImage) ? { mimeType: attachedImageMime, data: attachedImage } : undefined,
        pdf: (isPdf && attachedImage) ? { mimeType: attachedImageMime, data: attachedImage } : undefined,
        conversationId: activeConvId,
        userId: user.id || user.email,
        userName: profileData.fullName || "Ananya Kumar",
        modelOverride: activeModel,
        userGeminiKey: localGeminiKey,
        userOpenRouterKey: localOpenRouterKey,
        requestId: currentRequestId
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      let activeId = activeConvId;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("text/plain")) {
        activeId = response.headers.get("x-conversation-id") || activeId;
        setActiveConvId(activeId);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable.");
        const decoder = new TextDecoder();
        let done = false;
        let text = "";

        // Insert a temporary assistant message that will render the streaming content
        const tempMsgId = "stream-" + Math.random().toString(36).substring(2, 11);
        setMessages((prev) => [
          ...prev,
          { id: tempMsgId, role: "assistant", content: "", mode: "chat", created_at: new Date().toISOString() }
        ]);
        setStreamingMessageId(tempMsgId);
        setStreamingText("");

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          text += chunk;
          setStreamingText(text);
        }

        // Streaming is completed
        setStreamingMessageId(null);
        setStreamingText("");

        // Sync local storage if Supabase is not configured
        if (!isConfigured && activeId) {
          const smartTopic = getSmartChatTitle(undefined, activePrompt);
          const simulatedResponse = {
            subject: "General",
            topic: smartTopic,
            difficulty: "Easy",
            quick_answer: text,
            easy_explanation: text,
            normal_solution: text,
            formulas: [],
            examples: [],
            exam_answer: {},
            memory_trick: "",
            common_mistakes: [],
            important_points: [],
            quiz: [],
            confidence: "High"
          };
          
          await dbService.syncLocalChat(
            activeId,
            smartTopic,
            activePrompt,
            simulatedResponse.subject,
            activePrompt,
            simulatedResponse,
            attachedImage || undefined,
            attachedImageMime || undefined,
            aiMode
          );
        }

        setPrompt("");
        setAttachedImage(null);
        setAttachedImageMime(null);

        const list = await dbService.getConversations(user.id || user.email);
        setConversations(list);

        const msgs = await dbService.getMessages(activeId || "");
        setMessages(msgs);

        const limits = await dbService.checkUsageLimit(user.id || user.email);
        setUsageLimit(limits);

      } else {
        const data = await response.json();

        if (!response.ok) {
          if (data.error === "API_FAILURE" && data.configError) {
            setDevConfigError(data.devError);
          }
          throw new Error(data.message || data.error || "Failed to process request");
        }

        // Sync local storage if Supabase is not configured
        if (!isConfigured) {
          const smartTopic = getSmartChatTitle(data.response?.topic, activePrompt);
          await dbService.syncLocalChat(
            data.conversationId,
            smartTopic,
            activePrompt,
            data.response?.subject || "General",
            activePrompt,
            data.response,
            attachedImage || undefined,
            attachedImageMime || undefined,
            aiMode
          );
        }

        setPrompt("");
        setAttachedImage(null);
        setAttachedImageMime(null);
        
        const list = await dbService.getConversations(user.id || user.email);
        setConversations(list);
        
        activeId = data.conversationId;
        setActiveConvId(activeId);
        const msgs = await dbService.getMessages(activeId || "");
        setMessages(msgs);

        const limits = await dbService.checkUsageLimit(user.id || user.email);
        setUsageLimit(limits);
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("AI request was aborted by the user.");
      } else {
        setErrorMessage(err.message || "An unexpected issue occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Generate a new custom quiz using Gemini AI
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newQuizTopic.trim()) return;

    setIsGeneratingQuiz(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz-generate",
          topic: newQuizTopic,
          difficulty: newQuizDifficulty,
          numQuestions: newQuizNumQuestions,
          userId: user?.id || user?.email
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to generate quiz");
      }

      if (data.quiz && data.quiz.questions) {
        const newQuizItem = {
          id: `q-gen-${Date.now()}`,
          title: data.quiz.title || newQuizTopic,
          subject: data.quiz.subject || "Custom",
          questionsCount: data.quiz.questions.length,
          difficulty: newQuizDifficulty,
          score: null,
          createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          icon: "code",
          questions: data.quiz.questions
        };

        // Prepend new quiz to quizHistory list
        setQuizHistory(prev => [newQuizItem, ...prev]);
        setShowCreateQuizModal(false);
        setNewQuizTopic("");
        
        // Auto-start the generated quiz
        startQuizSession(newQuizItem);
      } else {
        throw new Error("Invalid quiz response format returned by tutor.");
      }
    } catch (err: any) {
      console.error("Quiz generation failed:", err);
      setErrorMessage(err.message || "Failed to generate quiz. Please try again.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Start taking a quiz
  const startQuizSession = (quiz: any) => {
    setActivePlayingQuiz(quiz);
    setPlayingQuizCurrentIndex(0);
    setPlayingQuizAnswers({});
    setPlayingQuizSubmitted(false);
    setPlayingQuizScore(0);
  };

  // Select an option during active playing quiz
  const selectPlayingQuizOption = (opt: string) => {
    if (playingQuizSubmitted) return;
    setPlayingQuizAnswers(prev => ({ ...prev, [playingQuizCurrentIndex]: opt }));
  };

  // Next question or submit playing quiz
  const handlePlayingQuizNext = () => {
    if (!activePlayingQuiz) return;
    
    // Check if there are more questions
    if (playingQuizCurrentIndex < activePlayingQuiz.questions.length - 1) {
      setPlayingQuizCurrentIndex(prev => prev + 1);
    } else {
      // Calculate final score and submit quiz
      let finalScore = 0;
      activePlayingQuiz.questions.forEach((q: any, idx: number) => {
        const answer = playingQuizAnswers[idx];
        if (answer && answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          finalScore++;
        }
      });

      setPlayingQuizScore(finalScore);
      setPlayingQuizSubmitted(true);

      // Record daily login + quiz solve streak
      recordStreakProgress();

      // Save score back to history list
      setQuizHistory(prev =>
        prev.map(q =>
          q.id === activePlayingQuiz.id
            ? { ...q, score: `${finalScore}/${activePlayingQuiz.questions.length}` }
            : q
        )
      );
    }
  };

  // Quiz scoring
  const handleQuizAnswer = (quizIdx: string, selectedOption: string, correctOption: string) => {
    if (submittedQuizzes[quizIdx]) return;
    setSelectedQuizAnswers(prev => {
      const updated = { ...prev, [quizIdx]: selectedOption };
      localStorage.setItem("quicksolv_quiz_answers", JSON.stringify(updated));
      return updated;
    });
  };

  const submitQuizAnswer = (quizIdx: string, selectedOption: string, correctOption: string) => {
    if (!selectedOption || submittedQuizzes[quizIdx]) return;

    setSubmittedQuizzes(prev => {
      const updated = { ...prev, [quizIdx]: true };
      localStorage.setItem("quicksolv_quiz_submissions", JSON.stringify(updated));
      return updated;
    });

    // Record daily login + quiz solve streak
    recordStreakProgress();

    const isCorrect = selectedOption.trim().toLowerCase() === correctOption.trim().toLowerCase();
    
    setQuizScores(prev => ({
      score: isCorrect ? prev.score + 1 : prev.score,
      total: prev.total + 1
    }));
  };

  // Notes helpers
  const handleCreateNote = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote = {
      id: `n-custom-${Date.now()}`,
      title: newNoteTitle,
      content: newNoteContent,
      subject: newNoteSubject,
      createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      isBookmarked: false
    };

    setNotesHistory(prev => [newNote, ...prev]);

    // Update folder count
    setFoldersList(prev =>
      prev.map(f =>
        f.name.toLowerCase() === newNoteSubject.toLowerCase()
          ? { ...f, notesCount: f.notesCount + 1 }
          : f
      )
    );

    setNewNoteTitle("");
    setNewNoteContent("");
    setShowCreateNoteModal(false);
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notesHistory.find(n => n.id === noteId);
    if (!noteToDelete) return;

    setNotesHistory(prev => prev.filter(n => n.id !== noteId));

    // Update folder count
    setFoldersList(prev =>
      prev.map(f =>
        f.name.toLowerCase() === noteToDelete.subject.toLowerCase()
          ? { ...f, notesCount: Math.max(0, f.notesCount - 1) }
          : f
      )
    );

    if (selectedNoteForView?.id === noteId) {
      setSelectedNoteForView(null);
    }
  };

  const handleCreateFolder = () => {
    const folderName = window.prompt("Enter new folder name:");
    if (!folderName || !folderName.trim()) return;

    const folderExists = foldersList.some(f => f.name.toLowerCase() === folderName.toLowerCase().trim());
    if (folderExists) {
      alert("A folder with this name already exists.");
      return;
    }

    const newFolder = {
      id: `f-custom-${Date.now()}`,
      name: folderName.trim(),
      notesCount: 0
    };

    setFoldersList(prev => [...prev, newFolder]);
  };

  const toggleBookmarkNote = (noteId: string) => {
    setNotesHistory(prev =>
      prev.map(n =>
        n.id === noteId ? { ...n, isBookmarked: !n.isBookmarked } : n
      )
    );
  };

  const downloadNoteAsPDF = async (note: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Accent top line
      doc.setFillColor(74, 39, 17);
      doc.rect(0, 0, pageWidth, 5, "F");

      // Title/Logo
      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("QuickSolv", margin, 20);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("PERSONAL STUDY NOTEBOOK", margin, 24);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // Note Title
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      
      const titleLines = doc.splitTextToSize(note.title, contentWidth);
      doc.text(titleLines, margin, 38);
      
      let currentY = 38 + (titleLines.length * 6);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(115, 115, 115);
      doc.text(`Subject: ${note.subject}   |   Created: ${note.createdOn}`, margin, currentY);
      
      currentY += 8;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      
      currentY += 10;

      // Note Content Body
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      
      const contentLines = doc.splitTextToSize(note.content, contentWidth);
      const pageHeight = doc.internal.pageSize.getHeight();
      const bottomMargin = 20;
      const maxContentY = pageHeight - bottomMargin;

      for (let i = 0; i < contentLines.length; i++) {
        if (currentY > maxContentY) {
          doc.addPage();
          currentY = 25;
          doc.setFillColor(74, 39, 17);
          doc.rect(0, 0, pageWidth, 5, "F");
        }
        
        doc.text(contentLines[i], margin, currentY);
        currentY += 6;
      }

      // Footers
      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Generated dynamically by QuickSolv AI Tutor   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const cleanTitle = note.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      doc.save(`quicksolv_note_${cleanTitle}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    }
  };

  const downloadSectionAsPDF = async (sectionName: string, content: string, topicName: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxContentY = pageHeight - 20;

      // Accent top line
      doc.setFillColor(74, 39, 17);
      doc.rect(0, 0, pageWidth, 5, "F");

      // Brand
      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("QuickSolv", margin, 20);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`STUDY NOTES SECTION: ${sectionName.toUpperCase()}`, margin, 24);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // Section and Topic Heading
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const headingText = `${topicName} - ${sectionName}`;
      const headingLines = doc.splitTextToSize(headingText, contentWidth);
      doc.text(headingLines, margin, 38);
      
      let currentY = 38 + (headingLines.length * 6);

      // Separator
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Content
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      const contentLines = doc.splitTextToSize(content, contentWidth);
      for (let i = 0; i < contentLines.length; i++) {
        if (currentY > maxContentY) {
          doc.addPage();
          currentY = 25;
          doc.setFillColor(74, 39, 17);
          doc.rect(0, 0, pageWidth, 5, "F");
        }
        doc.text(contentLines[i], margin, currentY);
        currentY += 6;
      }

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Section study notes exported from QuickSolv AI Tutor   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const cleanTitle = `${topicName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      doc.save(`quicksolv_${cleanTitle}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Failed to download section PDF.");
    }
  };

  const getResearchImages = (topic: string): { methodology: string; results: string; sketch: string } => {
    const t = topic.toLowerCase();
    if (t.includes("hydroponic") || t.includes("farm") || t.includes("agricult")) {
      return {
        methodology: "https://images.unsplash.com/photo-1558905611-37d404f21db5?auto=format&fit=crop&q=80&w=500&h=300",
        results: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500&h=300",
        sketch: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&q=80&w=500&h=300"
      };
    }
    if (t.includes("space") || t.includes("astronomy") || t.includes("galaxy") || t.includes("rocket")) {
      return {
        methodology: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=500&h=300",
        results: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500&h=300",
        sketch: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=500&h=300"
      };
    }
    if (t.includes("ai") || t.includes("machine learning") || t.includes("computer") || t.includes("code") || t.includes("dsa") || t.includes("algorithm")) {
      return {
        methodology: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=500&h=300",
        results: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500&h=300",
        sketch: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=500&h=300"
      };
    }
    return {
      methodology: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=500&h=300",
      results: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500&h=300",
      sketch: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=500&h=300"
    };
  };

  const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadMessageAsPDF = async (title: string, textContent: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const maxContentY = pageHeight - 20;

      // Decorative Header Bar
      doc.setFillColor(74, 39, 17);
      doc.rect(0, 0, pageWidth, 5, "F");

      // Brand Title Header
      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("QuickSolv AI", margin, 18);

      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`AI CHATBOT RESPONSE EXPORT  |  ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, margin, 23);

      doc.setDrawColor(230, 220, 210);
      doc.setLineWidth(0.5);
      doc.line(margin, 26, pageWidth - margin, 26);

      let currentY = 34;

      // Strip complex Markdown formatting symbols for clean PDF rendering
      const cleanText = textContent
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*/g, ''))
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#(.*?)\n/g, '$1\n')
        .replace(/`([^`]+)`/g, '$1');

      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(cleanText, contentWidth);
      for (let i = 0; i < lines.length; i++) {
        if (currentY > maxContentY) {
          doc.addPage();
          currentY = 20;
          doc.setFillColor(74, 39, 17);
          doc.rect(0, 0, pageWidth, 5, "F");
        }
        doc.text(lines[i], margin, currentY);
        currentY += 5.5;
      }

      // Footer with page numbering
      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(230, 220, 210);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Generated by QuickSolv AI Assistant   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        );
      }

      const safeTitle = (title || "response").toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 25);
      doc.save(`quicksolv_${safeTitle}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. Please try again.");
    }
  };

  const downloadResearchPaperAsPDF = async (study: GeminiStudyResponse) => {
    if (!study.research_paper) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const cueWidth = 45;
      const dividerX = 62;
      const mainX = 66;
      const mainWidth = pageWidth - mainX - margin;
      const maxContentY = pageHeight - 20;

      const drawPageSkeleton = () => {
        doc.setFillColor(74, 39, 17);
        doc.rect(0, 0, pageWidth, 4, "F");

        doc.setDrawColor(210, 200, 190);
        doc.setLineWidth(0.4);
        doc.line(dividerX, 10, dividerX, pageHeight - 15);
      };

      let currentY = 15;
      drawPageSkeleton();

      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("ACTIVE RECALL CUES", margin, currentY);

      doc.setTextColor(115, 115, 115);
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.text("The One-Page Visual Paper Summary Guide (Cornell Format)", mainX, currentY);
      currentY += 8;

      doc.setTextColor(30, 30, 30);
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      const citationLines = doc.splitTextToSize(study.research_paper.citation, mainWidth);
      doc.text(citationLines, mainX, currentY);
      currentY += (citationLines.length * 5) + 3;

      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const whyLines = doc.splitTextToSize(`Why I'm reading: ${study.research_paper.why_reading}`, mainWidth);
      doc.text(whyLines, mainX, currentY);
      currentY += (whyLines.length * 4) + 6;

      doc.setFillColor(250, 246, 240);
      const takeawayLines = doc.splitTextToSize(study.research_paper.takeaway, mainWidth - 8);
      const tkBoxHeight = (takeawayLines.length * 4.5) + 8;
      doc.rect(mainX, currentY, mainWidth, tkBoxHeight, "F");
      
      doc.setTextColor(74, 39, 17);
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.text("ONE-SENTENCE TAKEAWAY", mainX + 4, currentY + 5);
      
      doc.setTextColor(60, 60, 60);
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.text(takeawayLines, mainX + 4, currentY + 10);
      currentY += tkBoxHeight + 6;

      const addSummaryBlock = (label: string, text: string) => {
        if (currentY > maxContentY - 15) {
          doc.addPage();
          drawPageSkeleton();
          currentY = 15;
        }

        doc.setTextColor(74, 39, 17);
        doc.setFont("times", "bold");
        doc.setFontSize(10.5);
        doc.text(label, mainX, currentY);
        currentY += 5;

        doc.setTextColor(60, 60, 60);
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(text, mainWidth);
        for (const line of lines) {
          if (currentY > maxContentY) {
            doc.addPage();
            drawPageSkeleton();
            currentY = 15;
          }
          doc.text(line, mainX, currentY);
          currentY += 4.5;
        }
        currentY += 5;
      };

      addSummaryBlock("1. Problem & Background", study.research_paper.background);
      addSummaryBlock("2. Methodology", study.research_paper.methodology_text);

      const images = getResearchImages(study.topic || study.research_paper.citation);

      if (currentY + 35 > maxContentY) {
        doc.addPage();
        drawPageSkeleton();
        currentY = 15;
      }
      doc.setFillColor(245, 245, 245);
      doc.rect(mainX, currentY, 60, 30, "F");
      const base64Method = await getBase64ImageFromUrl(images.methodology);
      if (base64Method) {
        try {
          doc.addImage(base64Method, "JPEG", mainX + 1, currentY + 1, 58, 28);
        } catch {}
      }
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Fig 1: Methodology Pipeline Diagram", mainX + 30, currentY + 34, { align: "center" });
      currentY += 38;

      addSummaryBlock("3. Key Results & Performance", study.research_paper.results_text);
      if (currentY + 35 > maxContentY) {
        doc.addPage();
        drawPageSkeleton();
        currentY = 15;
      }
      doc.setFillColor(245, 245, 245);
      doc.rect(mainX, currentY, 60, 30, "F");
      const base64Results = await getBase64ImageFromUrl(images.results);
      if (base64Results) {
        try {
          doc.addImage(base64Results, "JPEG", mainX + 1, currentY + 1, 58, 28);
        } catch {}
      }
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Fig 2: Primary Results & Scaling Chart", mainX + 30, currentY + 34, { align: "center" });
      currentY += 38;

      addSummaryBlock("4. Visual Summary Sketch (Graphical Abstract)", study.research_paper.sketch_desc);
      if (currentY + 35 > maxContentY) {
        doc.addPage();
        drawPageSkeleton();
        currentY = 15;
      }
      doc.setFillColor(245, 245, 245);
      doc.rect(mainX, currentY, 60, 30, "F");
      const base64Sketch = await getBase64ImageFromUrl(images.sketch);
      if (base64Sketch) {
        try {
          doc.addImage(base64Sketch, "JPEG", mainX + 1, currentY + 1, 58, 28);
        } catch {}
      }
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Fig 3: Conceptual Design Sketch Box", mainX + 30, currentY + 34, { align: "center" });
      currentY += 38;

      addSummaryBlock("5. Limitations", study.research_paper.limitations);
      addSummaryBlock("6. Personal Interpretation & Integration", study.research_paper.interpretation);

      if (study.research_paper.glossary && study.research_paper.glossary.length > 0) {
        if (currentY > maxContentY - 15) {
          doc.addPage();
          drawPageSkeleton();
          currentY = 15;
        }
        doc.setTextColor(74, 39, 17);
        doc.setFont("times", "bold");
        doc.setFontSize(10.5);
        doc.text("7. Key Terms Glossary", mainX, currentY);
        currentY += 5;

        for (const item of study.research_paper.glossary) {
          const glossLine = `${item.term}: ${item.definition}`;
          const lines = doc.splitTextToSize(glossLine, mainWidth);
          for (const line of lines) {
            if (currentY > maxContentY) {
              doc.addPage();
              drawPageSkeleton();
              currentY = 15;
            }
            doc.setFont("times", "normal");
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.text(line, mainX, currentY);
            currentY += 4.5;
          }
        }
      }

      doc.setPage(1);
      let cueY = 30;
      doc.setTextColor(74, 39, 17);
      doc.setFont("times", "italic");
      doc.setFontSize(8.5);

      for (let cIdx = 0; cIdx < study.research_paper.cues.length; cIdx++) {
        const cueText = `${cIdx + 1}. ${study.research_paper.cues[cIdx]}`;
        const cueLines = doc.splitTextToSize(cueText, cueWidth);
        for (const line of cueLines) {
          doc.text(line, margin, cueY);
          cueY += 4.5;
        }
        cueY += 8;
      }

      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `QuickSolv Cornell Paper Summary Engine   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      }

      const cleanTitle = (study.topic || "research_paper").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      doc.save(`quicksolv_cornell_${cleanTitle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export research summary PDF.");
    }
  };

  const downloadSingleReplyAsPDF = async (study: GeminiStudyResponse) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const pageHeight = doc.internal.pageSize.getHeight();
      const bottomMargin = 20;
      const maxContentY = pageHeight - bottomMargin;

      // Top brand accent line
      doc.setFillColor(74, 39, 17);
      doc.rect(0, 0, pageWidth, 5, "F");

      // Header Brand
      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("QuickSolv AI", margin, 20);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("STUDY NOTES & COMPILATION", margin, 24);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // Topic Title
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleText = `${study.subject || "General"} - ${study.topic || "Study Notes"}`;
      const titleLines = doc.splitTextToSize(titleText, contentWidth);
      doc.text(titleLines, margin, 38);
      
      let currentY = 38 + (titleLines.length * 6);

      // Meta row
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(115, 115, 115);
      doc.text(`Difficulty: ${study.difficulty || "Medium"}   |   Date: ${new Date().toLocaleDateString()}`, margin, currentY);
      
      currentY += 8;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      const addSectionText = (sectionTitle: string, content: string) => {
        if (currentY > maxContentY - 15) {
          doc.addPage();
          currentY = 25;
          doc.setFillColor(74, 39, 17);
          doc.rect(0, 0, pageWidth, 5, "F");
        }

        doc.setTextColor(74, 39, 17);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(sectionTitle, margin, currentY);
        currentY += 6;

        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(content, contentWidth);
        
        for (let i = 0; i < lines.length; i++) {
          if (currentY > maxContentY) {
            doc.addPage();
            currentY = 25;
            doc.setFillColor(74, 39, 17);
            doc.rect(0, 0, pageWidth, 5, "F");
          }
          doc.text(lines[i], margin, currentY);
          currentY += 5.5;
        }
        currentY += 6;
      };

      if (study.quick_answer) {
        addSectionText("1. QUICK ANSWER", study.quick_answer);
      }

      if (study.easy_explanation) {
        addSectionText("2. EASY EXPLANATION", study.easy_explanation);
      }

      if (study.normal_solution) {
        addSectionText("3. DETAILED SOLUTION", study.normal_solution);
      }

      if (study.formulas && study.formulas.length > 0) {
        const formulaStr = study.formulas.map(f => `${f.formula}  (${f.meaning})`).join("\n");
        addSectionText("4. RELEVANT FORMULAS", formulaStr);
      }

      if (study.examples && study.examples.length > 0) {
        const exampleStr = study.examples.map(ex => `${ex.scenario || "Scenario"}: ${ex.explanation}`).join("\n\n");
        addSectionText("5. REAL-LIFE EXAMPLES", exampleStr);
      }

      if (study.memory_trick) {
        addSectionText("6. MEMORY SHORTCUT", study.memory_trick);
      }

      // Quiz is skipped here as explicitly requested

      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Study Notes generated by QuickSolv AI   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const cleanTitle = (study.topic || "study_notes").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      doc.save(`quicksolv_notes_${cleanTitle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF study notes.");
    }
  };

  const downloadStudyGuideAsPDF = async () => {
    if (messages.length === 0) {
      alert("No active conversation to export.");
      return;
    }

    const activeConv = conversations.find(c => c.id === activeConvId);
    const convTitle = activeConv?.title || "QuickSolv Study Chat";

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const pageHeight = doc.internal.pageSize.getHeight();
      const bottomMargin = 20;
      const maxContentY = pageHeight - bottomMargin;

      // Top brand accent line
      doc.setFillColor(74, 39, 17);
      doc.rect(0, 0, pageWidth, 5, "F");

      // Header Brand
      doc.setTextColor(74, 39, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("QuickSolv AI", margin, 20);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("COMPLETE CHAT CONVERSATION HISTORY", margin, 24);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // Chat Title
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(convTitle, contentWidth);
      doc.text(titleLines, margin, 38);
      
      let currentY = 38 + (titleLines.length * 6);

      // Meta row
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(115, 115, 115);
      doc.text(`Total Turns: ${Math.ceil(messages.length / 2)}   |   Date: ${new Date().toLocaleDateString()}`, margin, currentY);
      
      currentY += 8;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      const appendTextLines = (lines: string[], fontSize: number, isBold: boolean, color: [number, number, number]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);

        for (let i = 0; i < lines.length; i++) {
          if (currentY > maxContentY) {
            doc.addPage();
            currentY = 25;
            doc.setFillColor(74, 39, 17);
            doc.rect(0, 0, pageWidth, 5, "F");
          }
          doc.text(lines[i], margin, currentY);
          currentY += (fontSize * 0.5) + 0.8;
        }
      };

      messages.forEach((msg, mIdx) => {
        const isUser = msg.role === "user";
        
        if (mIdx > 0) {
          if (currentY > maxContentY - 10) {
            doc.addPage();
            currentY = 25;
            doc.setFillColor(74, 39, 17);
            doc.rect(0, 0, pageWidth, 5, "F");
          } else {
            doc.setDrawColor(245, 245, 245);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 6;
          }
        }

        const senderText = isUser ? "STUDENT QUESTION:" : "QUICKSOLV AI RESPONSE:";
        const senderColor: [number, number, number] = isUser ? [74, 39, 17] : [16, 124, 65];
        const senderLines = doc.splitTextToSize(senderText, contentWidth);
        appendTextLines(senderLines, 10, true, senderColor);
        currentY += 2;

        if (isUser) {
          const userTextLines = doc.splitTextToSize(msg.content, contentWidth);
          appendTextLines(userTextLines, 10, false, [30, 30, 30]);
          currentY += 6;
        } else {
          let study: GeminiStudyResponse;
          try {
            study = JSON.parse(msg.content);
          } catch {
            const rawTextLines = doc.splitTextToSize(msg.content, contentWidth);
            appendTextLines(rawTextLines, 9.5, false, [60, 60, 60]);
            currentY += 6;
            return;
          }

          const addSubSection = (title: string, value: string) => {
            if (!value) return;
            if (currentY > maxContentY - 10) {
              doc.addPage();
              currentY = 25;
              doc.setFillColor(74, 39, 17);
              doc.rect(0, 0, pageWidth, 5, "F");
            }
            appendTextLines([`  [${title}]`], 8.5, true, [74, 39, 17]);
            currentY += 1;
            const subLines = doc.splitTextToSize(value, contentWidth - 10);
            
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            
            for (let k = 0; k < subLines.length; k++) {
              if (currentY > maxContentY) {
                doc.addPage();
                currentY = 25;
                doc.setFillColor(74, 39, 17);
                doc.rect(0, 0, pageWidth, 5, "F");
              }
              doc.text(subLines[k], margin + 5, currentY);
              currentY += 5.2;
            }
            currentY += 4;
          };

          if (study.quick_answer) addSubSection("Quick Answer", study.quick_answer);
          if (study.easy_explanation) addSubSection("Easy Explanation", study.easy_explanation);
          if (study.normal_solution) addSubSection("Detailed Solution", study.normal_solution);
          
          if (study.formulas && study.formulas.length > 0) {
            const formulaStr = study.formulas.map(f => `${f.formula}  (${f.meaning})`).join("\n");
            addSubSection("Relevant Formulas", formulaStr);
          }
          
          if (study.examples && study.examples.length > 0) {
            const exampleStr = study.examples.map(ex => `${ex.scenario || "Scenario"}: ${ex.explanation}`).join("\n\n");
            addSubSection("Real-life Examples", exampleStr);
          }
          
          if (study.memory_trick) addSubSection("Memory Shortcut", study.memory_trick);
          
          if (study.quiz && study.quiz.length > 0) {
            let quizStr = "";
            study.quiz.forEach((q, qIdx) => {
              quizStr += `Q${qIdx + 1}: ${q.question}\nOptions:\n${q.options.map((o) => `  [ ] ${o}`).join("\n")}\n\n`;
            });
            addSubSection("Practice Quiz Questions", quizStr);
          }
        }
      });

      // Footers
      const totalPages = doc.internal.pages.length - 1;
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Chat Conversation exported from QuickSolv AI   |   Page ${j} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const cleanTitle = convTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      doc.save(`quicksolv_chat_${cleanTitle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF chat guide.");
    }
  };

  // Run AI Summary / AI Explain on Note content
  const handleNoteAIAction = async (actionType: "summarize" | "explain", note: any) => {
    setIsProcessingNoteAI(true);
    setNoteAIActionType(actionType);
    setNoteAIResult(null);
    setErrorMessage(null);

    const localGeminiKey = localStorage.getItem("quicksolv_gemini_api_key") || "";
    const localOpenRouterKey = localStorage.getItem("quicksolv_openrouter_api_key") || "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: actionType === "summarize" ? "note-summarize" : "note-explain",
          noteTitle: note.title,
          noteContent: note.content,
          userId: user?.id || user?.email,
          userGeminiKey: localGeminiKey,
          userOpenRouterKey: localOpenRouterKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to run AI ${actionType}`);
      }

      setNoteAIResult(data.result);
    } catch (err: any) {
      console.error(`Note AI ${actionType} failed:`, err);
      setErrorMessage(err.message || `Failed to process AI ${actionType}. Please try again.`);
    } finally {
      setIsProcessingNoteAI(false);
    }
  };

  // Convert Note content to interactive Quiz
  const handleNoteConvertToQuiz = async (note: any) => {
    setIsProcessingNoteAI(true);
    setNoteAIActionType("quiz-generate");
    setNoteAIResult(null);
    setErrorMessage(null);

    const localGeminiKey = localStorage.getItem("quicksolv_gemini_api_key") || "";
    const localOpenRouterKey = localStorage.getItem("quicksolv_openrouter_api_key") || "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note-quiz-generate",
          noteTitle: note.title,
          noteContent: note.content,
          userId: user?.id || user?.email,
          userGeminiKey: localGeminiKey,
          userOpenRouterKey: localOpenRouterKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to convert note to quiz");
      }

      if (data.quiz && data.quiz.questions) {
        const newQuizItem = {
          id: `q-gen-note-${Date.now()}`,
          title: data.quiz.title || `Quiz: ${note.title}`,
          subject: note.subject || "General",
          questionsCount: data.quiz.questions.length,
          difficulty: "Medium",
          score: null,
          createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          icon: "code",
          questions: data.quiz.questions
        };

        // Add to quiz list
        setQuizHistory(prev => [newQuizItem, ...prev]);
        
        // Close Note reader
        setSelectedNoteForView(null);
        
        // Switch to Quiz tab and launch
        setCurrentTab("Quiz");
        startQuizSession(newQuizItem);
      } else {
        throw new Error("Tutor returned quiz in invalid format.");
      }
    } catch (err: any) {
      console.error("Note quiz conversion failed:", err);
      setErrorMessage(err.message || "Failed to convert note to quiz. Please try again.");
    } finally {
      setIsProcessingNoteAI(false);
    }
  };

  // Save profile details to localStorage
  const handleSaveProfile = (updatedFields: Record<string, string>) => {
    if (!user) return;

    const newProfile = {
      ...profileData,
      ...updatedFields
    };

    setProfileData(newProfile);
    localStorage.setItem(`quicksolv_profile_${user.id || user.email}`, JSON.stringify(newProfile));
  };

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Filter pinned library
  const filteredSaved = savedAnswers.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.topic.toLowerCase().includes(q)
    );
  });

  // Render recent chat list timestamps
  const getRecentTimestamp = (conv: any) => {
    if (!conv) return "Just now";
    
    // Mockup overrides to match screenshots
    if (conv.id === "c-newton") return "10:30 AM";
    if (conv.id === "c-quadratic") return "Yesterday";
    if (conv.id === "c-photosynthesis") return "2 days ago";
    if (conv.id === "c-dbms") return "3 days ago";
    if (conv.id === "c-java-oop") return "4 days ago";
    if (conv.id === "c-work-power") return "5 days ago";
    if (conv.id === "c-digestive") return "6 days ago";
    if (conv.id === "c-arrays") return "7 days ago";
    
    if (!conv.created_at) return "Just now";
    try {
      const date = new Date(conv.created_at);
      if (isNaN(date.getTime())) return "Just now";
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else {
        return `${diffDays} days ago`;
      }
    } catch {
      return "Just now";
    }
  };

  const formatMessageTime = (msg: any) => {
    if (activeConvId === "c-newton" || activeConvId === "c-quadratic" || activeConvId === "c-photosynthesis") {
      return "10:30 AM";
    }
    if (!msg || !msg.created_at) return "Just now";
    try {
      const date = new Date(msg.created_at);
      if (isNaN(date.getTime())) return "Just now";
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return "Just now";
    }
  };

  // Helper to render the interactive History view (matches screenshot)
  const renderHistoryTabContent = () => {
    // Filter history based on search query, subject filter and quick filter
    const filteredConvs = conversations.filter(conv => {
      const matchesSearch = conv.title.toLowerCase().includes(searchHistoryQuery.toLowerCase()) ||
                            (conv.description && conv.description.toLowerCase().includes(searchHistoryQuery.toLowerCase()));
      
      const matchesSubject = historySubjectFilter === "All" ||
                             (conv.subject && conv.subject.toLowerCase() === historySubjectFilter.toLowerCase());

      // Quick filter check
      let matchesQuickFilter = true;
      if (historyQuickFilter === "Today") {
        const todayStr = new Date().toDateString();
        matchesQuickFilter = new Date(conv.created_at).toDateString() === todayStr;
      } else if (historyQuickFilter === "This Week") {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesQuickFilter = new Date(conv.created_at).getTime() >= oneWeekAgo;
      } else if (historyQuickFilter === "This Month") {
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        matchesQuickFilter = new Date(conv.created_at).getTime() >= oneMonthAgo;
      } else if (historyQuickFilter === "Bookmarked") {
        // Newton and Photosynthesis as simulated bookmarked
        matchesQuickFilter = conv.id === "c-newton" || conv.id === "c-photosynthesis";
      }

      return matchesSearch && matchesSubject && matchesQuickFilter;
    });

    // Grouping by Today / This Week / Older
    const todayConvs: any[] = [];
    const thisWeekConvs: any[] = [];
    const olderConvs: any[] = [];

    filteredConvs.forEach(conv => {
      const date = new Date(conv.created_at);
      const diffTime = Math.abs(Date.now() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (date.toDateString() === new Date().toDateString()) {
        todayConvs.push(conv);
      } else if (diffDays <= 7) {
        thisWeekConvs.push(conv);
      } else {
        olderConvs.push(conv);
      }
    });

    // Dynamic stats
    const totalConversations = conversations.length;
    const totalSavedChats = savedAnswers.length;
    const totalQuizzes = quizHistory.filter(q => q.score !== null).length;

    // Helper to get matching subject styles and custom icons
    const getSubjectMetaData = (subject: string = "", title: string = "") => {
      const sub = subject.toLowerCase();
      const t = title.toLowerCase();
      
      let icon = "⚛️";
      let badgeStyle = "bg-purple-50 text-purple-700 border-purple-250/50";
      
      if (sub.includes("math")) {
        icon = "📐";
        badgeStyle = "bg-purple-50 text-purple-700 border-purple-200/50";
      } else if (sub.includes("biol") || sub.includes("digest")) {
        icon = "🌱";
        badgeStyle = "bg-green-50 text-green-700 border-green-200/50";
      } else if (sub.includes("computer") || sub.includes("science") || sub.includes("dbms")) {
        icon = "💾";
        badgeStyle = "bg-blue-50 text-blue-700 border-blue-200/50";
      } else if (sub.includes("prog") || sub.includes("java") || sub.includes("code")) {
        icon = "💻";
        badgeStyle = "bg-orange-50 text-orange-700 border-orange-200/50";
      } else if (sub.includes("phys") || sub.includes("newton") || sub.includes("work")) {
        icon = "√x";
        badgeStyle = "bg-[#4A2711]/5 text-[#4A2711] border-[#4A2711]/20";
      }

      // Hardcode custom icons from screenshot
      if (t.includes("newton")) icon = "√x";
      if (t.includes("quadratic")) icon = "📊";
      if (t.includes("photosynthesis")) icon = "🌱";
      if (t.includes("dbms")) icon = "💾";
      if (t.includes("java")) icon = "💻";
      if (t.includes("work")) icon = "⚛️";
      if (t.includes("digestive")) icon = "📕";
      if (t.includes("array")) icon = "📈";

      return { icon, badgeStyle };
    };

    return (
      <div className="flex-grow flex overflow-hidden bg-[#FCF9F5]">
        
        {/* Left Side: History List and Filters */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">History</h1>
            <p className="text-xs text-gray-400 mt-1">View and continue your past conversations</p>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                placeholder="Search your history..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
              />
            </div>
            
            {/* Subject filter dropdown */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <select
                value={historySubjectFilter}
                onChange={(e) => setHistorySubjectFilter(e.target.value)}
                className="p-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none font-medium cursor-pointer"
              >
                <option value="All">All Conversations</option>
                <option value="Physics">Physics</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Programming">Programming</option>
              </select>
              
              <button className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition border border-gray-200">
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Grouped Feeds */}
          <div className="space-y-6">
            
            {/* TODAY SECTION */}
            {todayConvs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Today</h3>
                <div className="space-y-2.5">
                  {todayConvs.map(conv => {
                    const { icon, badgeStyle } = getSubjectMetaData(conv.subject, conv.title);
                    return renderHistoryRow(conv, icon, badgeStyle);
                  })}
                </div>
              </div>
            )}

            {/* THIS WEEK SECTION */}
            {thisWeekConvs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">This Week</h3>
                <div className="space-y-2.5">
                  {thisWeekConvs.map(conv => {
                    const { icon, badgeStyle } = getSubjectMetaData(conv.subject, conv.title);
                    return renderHistoryRow(conv, icon, badgeStyle);
                  })}
                </div>
              </div>
            )}

            {/* OLDER SECTION */}
            {olderConvs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Older</h3>
                <div className="space-y-2.5">
                  {olderConvs.map(conv => {
                    const { icon, badgeStyle } = getSubjectMetaData(conv.subject, conv.title);
                    return renderHistoryRow(conv, icon, badgeStyle);
                  })}
                </div>
              </div>
            )}

            {filteredConvs.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-gray-400 font-medium">
                No past conversations match your active filter.
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Quick Filters & Charts */}
        <div className="w-72 border-l border-gray-200/50 bg-[#FCF9F5] p-5 hidden xl:flex flex-col space-y-5 overflow-y-auto shrink-0 z-0">
          
          {/* Card 1: Overview stats */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-905 font-serif">History Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">💬</span>
                <div className="text-base font-bold text-gray-900">{totalConversations + 120}</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Total Chats</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">🔖</span>
                <div className="text-base font-bold text-gray-900">{totalSavedChats + 32}</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Saved Chats</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">📝</span>
                <div className="text-base font-bold text-gray-900">{totalQuizzes + 30}</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Quizzes Taken</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">⏱️</span>
                <div className="text-base font-bold text-gray-900">42h</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Time Learned</div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Filters */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-905 font-serif">Quick Filters</h3>
            </div>
            <div className="text-xs space-y-1.5">
              {[
                { name: "All Conversations", filter: "All", count: totalConversations + 120 },
                { name: "Today", filter: "Today", count: 12 },
                { name: "This Week", filter: "This Week", count: 28 },
                { name: "This Month", filter: "This Month", count: 86 },
                { name: "Bookmarked", filter: "Bookmarked", count: 45 }
              ].map(q => {
                const isActive = historyQuickFilter === q.filter;
                return (
                  <button
                    key={q.filter}
                    onClick={() => setHistoryQuickFilter(q.filter)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition font-semibold ${
                      isActive
                        ? "bg-[#4A2711]/10 text-[#4A2711] font-bold"
                        : "text-gray-700 hover:bg-gray-55"
                    }`}
                  >
                    <span>{q.name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 p-0.5 px-2 rounded-md font-bold">
                      {q.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Top Subjects Donut Chart */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-905 font-serif">Top Subjects</h3>
            <div className="flex items-center gap-4">
              {/* Circular SVG Donut Chart */}
              <div className="w-20 h-20 shrink-0 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                  
                  {/* Physics (32%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#4A2711" strokeWidth="3" 
                          strokeDasharray="32 68" strokeDashoffset="0" />
                          
                  {/* Mathematics (25%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3" 
                          strokeDasharray="25 75" strokeDashoffset="-32" />
                          
                  {/* Computer Science (20%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3" 
                          strokeDasharray="20 80" strokeDashoffset="-57" />
                          
                  {/* Biology (15%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3" 
                          strokeDasharray="15 85" strokeDashoffset="-77" />
                          
                  {/* Others (8%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#9CA3AF" strokeWidth="3" 
                          strokeDasharray="8 92" strokeDashoffset="-92" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white rounded-full shadow-inner flex items-center justify-center text-[9px] font-bold text-gray-500">
                    QuickSolv
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1 text-[9px] font-semibold text-gray-550">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4A2711]"></span>Physics</span>
                  <span className="font-bold text-gray-700">32%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Math</span>
                  <span className="font-bold text-gray-700">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>CS</span>
                  <span className="font-bold text-gray-700">20%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Biology</span>
                  <span className="font-bold text-gray-700">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Others</span>
                  <span className="font-bold text-gray-700">8%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Helper row renderer inside History
  const renderHistoryRow = (conv: any, icon: string, badgeStyle: string) => {
    const isMenuOpen = showHistoryActionMenuId === conv.id;
    
    // Relative timestamp display
    let timestamp = "10:30 AM";
    const date = new Date(conv.created_at);
    const diffTime = Math.abs(Date.now() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) timestamp = "10:30 AM";
    else if (diffDays === 2) timestamp = "Yesterday";
    else if (diffDays > 2) timestamp = `${diffDays - 1} days ago`;

    // Overrides matching mockup
    if (conv.id === "c-newton") timestamp = "10:30 AM";
    if (conv.id === "c-quadratic") timestamp = "Yesterday";
    if (conv.id === "c-photosynthesis") timestamp = "2 days ago";
    if (conv.id === "c-dbms") timestamp = "3 days ago";
    if (conv.id === "c-java-oop") timestamp = "4 days ago";
    if (conv.id === "c-work-power") timestamp = "5 days ago";
    if (conv.id === "c-digestive") timestamp = "6 days ago";
    if (conv.id === "c-arrays") timestamp = "7 days ago";

    return (
      <div
        key={conv.id}
        onClick={() => {
          setActiveConvId(conv.id);
          setCurrentTab("Home");
        }}
        className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between text-xs hover:border-gray-350 cursor-pointer shadow-sm hover:shadow transition relative"
      >
        <div className="flex items-center gap-4 min-w-0 pr-4">
          {/* Custom icon container */}
          <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#EADDC9]/40 flex items-center justify-center text-sm font-bold text-[#4A2711] shrink-0 font-serif">
            {icon}
          </div>
          
          <div className="min-w-0 space-y-1">
            <h4 className="font-bold text-gray-900 truncate leading-snug">{conv.title}</h4>
            <p className="text-[10px] text-gray-450 truncate max-w-sm sm:max-w-xl">
              {conv.description || "View summary details of this study session."}
            </p>
          </div>
        </div>

        {/* Timestamp and action badge */}
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
          <span className="text-[10px] text-gray-400 font-semibold">{timestamp}</span>
          <span className={`text-[9px] font-bold p-0.5 px-2 border rounded-full ${badgeStyle}`}>
            {conv.subject || "General"}
          </span>
          
          {/* Action dots menu */}
          <div className="relative">
            <button
              onClick={() => setShowHistoryActionMenuId(isMenuOpen ? null : conv.id)}
              className="p-1.5 hover:bg-gray-50 text-gray-455 hover:text-gray-800 rounded-lg transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50 text-[11px] text-gray-700 animate-fade-in font-medium">
                <button
                  onClick={() => {
                    setDeletingConv(conv);
                    setShowHistoryActionMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 hover:text-red-600 transition flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Chat
                </button>
                <button
                  onClick={() => {
                    setRenamingConv(conv);
                    setRenameInputTitle(conv.title || "");
                    setShowHistoryActionMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename Heading
                </button>
                <button
                  onClick={() => {
                    alert("Chat pinned to sidebar.");
                    setShowHistoryActionMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 transition border-t border-gray-100 mt-1"
                >
                  📌 Pin Sidebar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsTabContent = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#FCF9F5]">
        {/* Settings Header & Sub-Tab Bar */}
        <div className="p-6 pb-2 shrink-0 border-b border-gray-200/60 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-serif flex items-center gap-2">
                Settings ⚙️
              </h1>
              <p className="text-xs text-gray-450 mt-0.5">Access your chat history and bookmarked study items.</p>
            </div>
          </div>

          <div className="flex border-b border-gray-200/80 pb-px gap-2 text-xs font-semibold select-none overflow-x-auto">
            <button
              onClick={() => setSettingsTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
                settingsTab === "history"
                  ? "bg-[#FAF5EE] text-[#4A2711] font-bold border border-[#EADDC9]"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>

            <button
              onClick={() => setSettingsTab("saved")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
                settingsTab === "saved"
                  ? "bg-[#FAF5EE] text-[#4A2711] font-bold border border-[#EADDC9]"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved
            </button>
          </div>
        </div>

        {/* Sub-tab content view */}
        <div className="flex-1 overflow-hidden flex">
          {settingsTab === "saved" ? (
            renderSavedTabContent()
          ) : (
            renderHistoryTabContent()
          )}
        </div>
      </div>
    );
  };

  const renderSavedTabContent = () => {
    const savedConvs = conversations.filter(c => c.is_saved);

    return (
      <div className="flex-grow flex overflow-hidden bg-[#FCF9F5]">
        <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Saved Chats</h1>
            <p className="text-xs text-gray-400 mt-1">Access your bookmarked study conversations</p>
          </div>

          <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-sm">
            {savedConvs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedConvs.map(conv => {
                  let icon = "⚛️";
                  let badgeStyle = "bg-purple-50 text-purple-700 border-purple-250/50";
                  const sub = (conv.subject || "").toLowerCase();
                  if (sub.includes("math")) {
                    icon = "📐";
                    badgeStyle = "bg-purple-50 text-purple-700 border-purple-200/50";
                  } else if (sub.includes("biol")) {
                    icon = "🌱";
                    badgeStyle = "bg-green-50 text-green-700 border-green-200/50";
                  } else if (sub.includes("computer") || sub.includes("science")) {
                    icon = "💾";
                    badgeStyle = "bg-blue-50 text-blue-700 border-blue-200/50";
                  } else if (sub.includes("phys")) {
                    icon = "√x";
                    badgeStyle = "bg-[#4A2711]/5 text-[#4A2711] border-[#4A2711]/20";
                  }

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setCurrentTab("Home");
                      }}
                      className="border border-gray-200 hover:border-gray-350 bg-white p-4 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-xs hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] border border-[#EADDC9]/40 flex items-center justify-center text-sm font-bold text-[#4A2711] shrink-0 font-serif">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">{conv.title}</h4>
                          <p className="text-[10px] text-gray-450 truncate mt-0.5 max-w-xs">
                            {conv.description || "Bookmarked study guide session."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={`text-[9px] font-bold p-0.5 px-2 border rounded-full ${badgeStyle}`}>
                          {conv.subject || "General"}
                        </span>
                        
                        <button
                          onClick={async () => {
                            await dbService.toggleSaveConversation(conv.id, false);
                            setConversations(prev =>
                              prev.map(c => c.id === conv.id ? { ...c, is_saved: false } : c)
                            );
                          }}
                          className="p-1 rounded-lg text-amber-500 hover:text-gray-400 hover:bg-gray-55 transition"
                          title="Unsave chat"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <span className="text-4xl">🔖</span>
                <h3 className="font-bold text-gray-800 font-serif text-sm">No saved chats yet</h3>
                <p className="text-xs text-gray-400 max-w-xs">Click the bookmark icon in the header during a chat to save your study guide conversations here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStudyPlanTabContent = () => {
    if (!activeStudyPlan) {
      return (
        <div className="flex-grow flex items-center justify-center bg-[#FCF9F5]">
          <div className="p-6 flex flex-col justify-center items-center text-center space-y-4 max-w-sm">
            <span className="text-4xl animate-bounce">📅</span>
            <h2 className="text-xl font-bold text-gray-900 font-serif">Personal Study Plan</h2>
            <p className="text-xs text-gray-400">Create schedules, track learning goals, and get recommendations from your AI tutor.</p>
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-5 py-2.5 bg-[#4A2711] hover:bg-[#603216] text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              + Create Study Schedule
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 bg-[#FCF9F5] overflow-y-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">
              Active Roadmap &bull; {activeStudyPlan.difficulty} Difficulty
            </span>
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              {activeStudyPlan.topic} Plan ({activeStudyPlan.subject})
            </h2>
            <div className="text-[10px] text-gray-450 flex items-center gap-1.5 font-sans">
              <span>Target: {new Date(activeStudyPlan.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>&bull;</span>
              <span>Goal: {activeStudyPlan.dailyMinutes} mins / day</span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-3.5 py-1.5 border border-[#4A2711]/20 hover:bg-[#4A2711]/5 text-[#4A2711] text-[10px] font-bold rounded-xl transition"
            >
              Reset Plan
            </button>
            <button
              onClick={handleDeleteStudyPlan}
              className="px-3.5 py-1.5 bg-red-55 hover:bg-red-100 text-red-600 border border-red-200/30 text-[10px] font-bold rounded-xl transition"
            >
              Delete Plan
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm space-y-3 font-sans">
          <div className="flex justify-between items-center text-xs font-bold text-gray-800">
            <span>Overall Roadmap Progress</span>
            <span className="bg-amber-100/60 px-2 py-0.5 rounded text-amber-900 text-[10px]">
              {activeStudyPlan.progress}% Completed
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#4A2711] h-full rounded-full transition-all duration-500"
              style={{ width: `${activeStudyPlan.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Day-by-Day Roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
          {activeStudyPlan.days.map((day: any) => {
            const dayCompleted = day.tasks.every((t: any) => t.completed);
            return (
              <div
                key={day.dayNum}
                className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3.5 transition hover:scale-[1.01] ${
                  dayCompleted ? "border-green-200 bg-green-50/10" : "border-gray-200/80"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      dayCompleted ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                    }`}>
                      Day {day.dayNum}
                    </span>
                    {dayCompleted && <span className="text-green-600 text-xs font-bold">Done ✓</span>}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-bold text-gray-900 text-[11.5px] leading-tight font-serif">{day.title}</h4>
                  <p className="text-[10px] text-gray-450 leading-relaxed font-serif pt-1">{day.description}</p>
                </div>

                {/* Day Tasks checklist */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {day.tasks.map((task: any) => (
                    <button
                      key={task.id}
                      onClick={() => toggleStudyPlanTask(day.dayNum, task.id)}
                      className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl border border-gray-150/50 hover:border-gray-200 bg-gray-50/30 transition text-[10.5px] font-medium text-gray-700"
                    >
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition text-[9px] font-bold ${
                        task.completed
                          ? "bg-[#4A2711] border-[#4A2711] text-white"
                          : "border-gray-300 bg-white"
                      }`}>
                        {task.completed && "✓"}
                      </div>
                      <span className={`leading-relaxed font-serif pt-0.5 ${task.completed ? "line-through text-gray-400" : "text-gray-750"}`}>
                        {task.text}
                      </span>
                    </button>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    );
  };

  // Helper to render the interactive User Profile view
  const renderProfileTabContent = () => {
    const fieldsMeta = [
      { key: "fullName", label: "Full Name", placeholder: "e.g. Ananya Kumar" },
      { key: "emailAddress", label: "Email Address", placeholder: "e.g. ananya.kumar25@gmail.com" },
      { key: "phoneNumber", label: "Phone Number", placeholder: "e.g. +91 98765 43210" },
      { key: "dob", label: "Date of Birth", placeholder: "e.g. 12 March 2003" },
      { key: "gender", label: "Gender", placeholder: "e.g. Female" },
      { key: "location", label: "Location", placeholder: "e.g. Bengaluru, Karnataka, India" }
    ];

    // Compute dynamic stats
    const totalNotes = notesHistory.length;
    const totalQuizzes = quizHistory.filter(q => q.score !== null).length;
    const totalConversations = conversations.length;

    return (
      <div className="flex-grow flex overflow-hidden bg-[#FCF9F5]">
        
        {/* Left/Center Side: Profile Details */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">My Profile</h1>
            <p className="text-xs text-gray-400 mt-1">Manage your account and preferences</p>
          </div>

          {/* Banner Wave Card */}
          <div className="relative bg-[#FAF5EE] border border-gray-200/80 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-5">
            
            {/* Wave background decor */}
            <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none select-none text-7xl translate-y-6 translate-x-4">
              🌊
            </div>

            {/* Avatar block */}
            <div className="relative group shrink-0">
              <img
                src={profileData.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"}
                alt="Profile Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md bg-white"
              />
              <button
                onClick={() => {
                  const url = window.prompt("Enter new avatar image URL:", profileData.avatarUrl);
                  if (url) handleSaveProfile({ avatarUrl: url });
                }}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#4A2711] transition"
                title="Change Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Banner Meta details */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <h3 className="text-lg font-bold text-gray-955 font-serif truncate">
                  {profileData.fullName || "Your Name"}
                </h3>
                <span className="text-[9px] font-bold p-0.5 px-2 bg-[#4A2711]/10 text-[#4A2711] rounded-full border border-[#4A2711]/20">
                  Free Plan
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">{profileData.emailAddress || "email@example.com"}</p>
              <p className="text-[10px] text-gray-405 font-semibold mt-1">{profileData.joinedOn}</p>
            </div>

            {/* Edit Profile Quick toggle */}
            <button
              onClick={() => setShowEditAllModal(true)}
              className="px-4 py-2 border border-gray-250 hover:bg-white text-xs font-bold rounded-xl transition bg-white/70 shadow-sm text-gray-700 flex items-center gap-1.5"
            >
              Edit Profile
            </button>

          </div>

          {/* Sub-tab selection row */}
          <div className="flex border-b border-gray-200/60 pb-px gap-6 text-xs font-semibold overflow-x-auto shrink-0 select-none scrollbar-none">
            {["Personal Info", "Preferences", "Security", "Subscription", "Activity"].map(tabName => {
              const isActive = activeProfileTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveProfileTab(tabName)}
                  className={`pb-3 relative transition shrink-0 ${isActive ? "text-[#4A2711] font-bold" : "text-gray-400 hover:text-gray-750"}`}
                >
                  {tabName}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A2711] rounded-full"></div>}
                </button>
              );
            })}
          </div>

          {/* Render Tab Contents */}
          {activeProfileTab === "Personal Info" ? (
            <div className="space-y-6">
              
              {/* Fields Table */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-100">
                <div className="p-4 bg-gray-50/50">
                  <h4 className="text-xs font-bold text-gray-900 font-serif">Personal Information</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Update your personal details below.</p>
                </div>

                {fieldsMeta.map(field => {
                  const isEditing = editProfileFields[field.key] !== undefined;
                  const val = profileData[field.key];

                  return (
                    <div key={field.key} className="p-4 flex items-center justify-between text-xs min-h-[58px]">
                      {/* Label */}
                      <div className="w-1/3 text-gray-450 font-semibold truncate pr-4">{field.label}</div>

                      {/* Content Area */}
                      <div className="flex-1 flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex-grow flex items-center gap-2">
                            <input
                              type="text"
                              value={editProfileFields[field.key]}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                setEditProfileFields(prev => ({ ...prev, [field.key]: newVal }));
                              }}
                              placeholder={field.placeholder}
                              className="flex-grow p-1.5 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                handleSaveProfile({ [field.key]: editProfileFields[field.key] });
                                setEditProfileFields(prev => {
                                  const copy = { ...prev };
                                  delete copy[field.key];
                                  return copy;
                                });
                              }}
                              className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditProfileFields(prev => {
                                  const copy = { ...prev };
                                  delete copy[field.key];
                                  return copy;
                                });
                              }}
                              className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className={`font-medium ${val ? "text-gray-800" : "text-gray-350 italic"}`}>
                            {val || "Not set"}
                          </span>
                        )}
                      </div>

                      {/* Edit CTA */}
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditProfileFields(prev => ({ ...prev, [field.key]: val || "" }));
                          }}
                          className="text-[11px] text-[#4A2711] font-bold hover:underline shrink-0 p-1 hover:bg-[#4A2711]/5 rounded-lg transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* About Me block */}
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 font-serif">About Me</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Brief description about yourself.</p>
                  </div>
                  {editProfileFields["aboutMe"] === undefined && (
                    <button
                      onClick={() => setEditProfileFields(prev => ({ ...prev, aboutMe: profileData.aboutMe || "" }))}
                      className="text-[11px] text-[#4A2711] font-bold hover:underline shrink-0 p-1 rounded-lg hover:bg-[#4A2711]/5 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editProfileFields["aboutMe"] !== undefined ? (
                  <div className="space-y-2">
                    <textarea
                      value={editProfileFields["aboutMe"]}
                      onChange={(e) => setEditProfileFields(prev => ({ ...prev, aboutMe: e.target.value }))}
                      placeholder="Write a short summary about yourself..."
                      rows={3}
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditProfileFields(prev => {
                            const copy = { ...prev };
                            delete copy["aboutMe"];
                            return copy;
                          });
                        }}
                        className="px-3 py-1.5 border border-gray-250 text-gray-600 rounded-lg font-semibold bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleSaveProfile({ aboutMe: editProfileFields["aboutMe"] });
                          setEditProfileFields(prev => {
                            const copy = { ...prev };
                            delete copy["aboutMe"];
                            return copy;
                          });
                        }}
                        className="px-4 py-1.5 bg-[#4A2711] hover:bg-[#5c3216] text-white rounded-lg font-bold shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`leading-relaxed text-xs ${profileData.aboutMe ? "text-gray-700" : "text-gray-350 italic"}`}>
                    {profileData.aboutMe || "Describe who you are, what you are studying, or your learning goals..."}
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-gray-400 font-medium">
              This panel is simulated. Click "Personal Info" to edit your profile.
            </div>
          )}

          {/* Footer branding */}
          <div className="pt-8 border-t border-gray-200/50 flex flex-col sm:flex-row justify-between text-[10px] text-gray-400 font-semibold gap-2 shrink-0">
            <span>&copy; {new Date().getFullYear()} QuickSolv. All rights reserved.</span>
            <div className="flex gap-4">
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
              <span className="hover:underline cursor-pointer">Terms of Service</span>
            </div>
          </div>

        </div>

        {/* Right Side: Learning stats overview */}
        <div className="w-72 border-l border-gray-200/50 bg-[#FCF9F5] p-5 hidden xl:flex flex-col space-y-5 overflow-y-auto shrink-0">
          
          {/* Card 1: Stats summary */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-905 font-serif">Learning Overview</h3>
              <span className="text-[10px] text-gray-400 hover:underline cursor-pointer">View all</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-55 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">💬</span>
                <div className="text-lg font-bold text-gray-900">{conversations.length}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Chats</div>
              </div>
              <div className="p-3 bg-gray-55 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">📚</span>
                <div className="text-lg font-bold text-gray-900">{quizHistory.filter(q => q.score !== null).length}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Quizzes</div>
              </div>
              <div className="p-3 bg-gray-55 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">📝</span>
                <div className="text-lg font-bold text-gray-900">{notesHistory.length}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Notes</div>
              </div>
              <div className="p-3 bg-gray-55 border border-gray-100 rounded-xl space-y-1.5">
                <span className="text-base">⏱️</span>
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(conversations.length * 0.5 + quizHistory.filter(q => q.score !== null).length * 0.7 + notesHistory.length * 0.3)}
                </div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Hours</div>
              </div>
            </div>
          </div>

          {/* Card 2: Current plan features */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-905 font-serif">Current Plan</h3>
              <span className="text-[9px] font-bold p-0.5 px-2 bg-[#4A2711]/10 text-[#4A2711] rounded-full">Free</span>
            </div>
            
            <div className="text-[10px] space-y-2.5 text-gray-600 font-medium">
              <div className="flex items-center gap-2">✓ <span>Limited chats per day</span></div>
              <div className="flex items-center gap-2">✓ <span>Access to core features</span></div>
              <div className="flex items-center gap-2">✓ <span>Basic AI models</span></div>
              <div className="flex items-center gap-2">✓ <span>Community support</span></div>
              <div className="flex items-center gap-2">✓ <span>Standard response speed</span></div>
            </div>

            <button
              onClick={() => alert("QuickSolv Pro payment integration.")}
              className="w-full py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1"
            >
              👑 Upgrade to Pro
            </button>
          </div>

          {/* Card 3: Quick Actions */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-905 font-serif">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profileData, notesHistory, quizHistory }));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", "quicksolv_student_data.json");
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center font-bold text-gray-700 bg-white"
              >
                💾 Data
              </button>
              <button
                onClick={() => alert("Manage Devices integration.")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center font-bold text-gray-700 bg-white"
              >
                📱 Devices
              </button>
              <button
                onClick={() => alert("Help and Support ticket creation.")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center font-bold text-gray-700 bg-white"
              >
                📞 Support
              </button>
              <button
                onClick={handleLogout}
                className="p-2 border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-655 hover:border-red-200 transition text-center font-bold text-gray-700 bg-white"
              >
                🚪 Logout
              </button>
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Helper to render the interactive Notes view
  const renderNotesTabContent = () => {
    // Filter notes based on active folder filter and search query
    const filteredNotes = notesHistory.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
                            note.content.toLowerCase().includes(searchNotesQuery.toLowerCase());
      const matchesFolder = activeFolderFilter === "All" ||
                            note.subject.toLowerCase() === activeFolderFilter.toLowerCase();
      return matchesSearch && matchesFolder;
    });

    return (
      <div className="flex-grow flex overflow-hidden bg-[#FCF9F5]">
        
        {/* Left/Center side: folder structure and notes list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
          
          {/* Notes Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-serif flex items-center gap-2">
                My Notes <span className="text-lg">📄</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">Keep your important notes organized and easy to access.</p>
            </div>
            
            {/* Mobile-only Create Note action */}
            <button
              onClick={() => {
                setNewNoteTitle("");
                setNewNoteContent("");
                setShowCreateNoteModal(true);
              }}
              className="xl:hidden px-4 py-2 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              + Create Note
            </button>
          </div>

          {/* Controls: Search, Sort & Layout */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchNotesQuery}
                onChange={(e) => setSearchNotesQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
              />
            </div>
            
            {/* Sort & Filters */}
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
              <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Sort by:</span>
              <select
                value={sortNotesBy}
                onChange={(e) => setSortNotesBy(e.target.value)}
                className="p-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none font-medium cursor-pointer"
              >
                <option value="Recent">Recent</option>
                <option value="Alphabetical">Alphabetical</option>
              </select>
              
              <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
                <button className="p-2 bg-gray-50 text-[#4A2711] hover:bg-gray-100 transition"><Layers className="w-3.5 h-3.5" /></button>
                <button className="p-2 bg-white text-gray-450 hover:bg-gray-55 transition border-l border-gray-200"><Menu className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {/* Folders Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Folders</h2>
              <button onClick={() => setActiveFolderFilter("All")} className="text-[10px] text-[#4A2711] font-bold hover:underline">
                View all folders
              </button>
            </div>

            {/* Folders Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {foldersList.map(folder => {
                const isActive = activeFolderFilter.toLowerCase() === folder.name.toLowerCase();
                
                // Fetch dynamic folder notes count
                const actualCount = notesHistory.filter(n => n.subject.toLowerCase() === folder.name.toLowerCase()).length;

                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveFolderFilter(isActive ? "All" : folder.name)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex flex-col justify-between h-20 shadow-sm ${
                      isActive
                        ? "bg-[#4A2711]/10 border-[#4A2711] text-[#4A2711]"
                        : "bg-white border-gray-200/80 hover:bg-gray-50/50 text-gray-755"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xl">📁</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmDelete = window.confirm(`Delete folder "${folder.name}"? (Does not delete notes inside)`);
                          if (confirmDelete) {
                            setFoldersList(prev => prev.filter(f => f.id !== folder.id));
                            if (activeFolderFilter === folder.name) setActiveFolderFilter("All");
                          }
                        }}
                        className="p-0.5 text-gray-400 hover:text-red-500 rounded transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 truncate">{folder.name}</h4>
                      <p className="text-[9px] text-gray-400 font-medium mt-0.5">{actualCount} notes</p>
                    </div>
                  </div>
                );
              })}

              {/* Add Folder Card */}
              <div
                onClick={handleCreateFolder}
                className="p-3.5 rounded-2xl border border-dashed border-gray-300 bg-gray-50/30 hover:bg-gray-50 text-xs cursor-pointer transition flex flex-col items-center justify-center h-20 shadow-sm text-gray-500 gap-1"
              >
                <Plus className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-[10px] uppercase tracking-wider">New Folder</span>
              </div>
            </div>
          </div>

          {/* Notes list */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">All Notes</h2>
            
            {filteredNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredNotes.map(note => {
                  let emoji = "⚛️";
                  let badgeColor = "bg-purple-50 text-purple-700 border-purple-200/50";
                  
                  if (note.subject.toLowerCase().includes("math")) {
                    emoji = "📐";
                    badgeColor = "bg-green-50 text-green-700 border-green-200/50";
                  } else if (note.subject.toLowerCase().includes("computer") || note.subject.toLowerCase().includes("code")) {
                    emoji = "💻";
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                  } else if (note.subject.toLowerCase().includes("chemistry")) {
                    emoji = "🧪";
                    badgeColor = "bg-blue-50 text-blue-700 border-blue-200/50";
                  } else if (note.subject.toLowerCase().includes("biology") || note.subject.toLowerCase().includes("leaf")) {
                    emoji = "🌱";
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                  }

                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteForView(note)}
                      className="bg-white border border-gray-200/60 hover:border-gray-350 rounded-2xl p-4 shadow-sm space-y-4 hover:shadow-md transition cursor-pointer flex flex-col justify-between text-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 rounded-xl bg-[#FAF6F0] border border-[#EADDC9]/40 flex items-center justify-center text-sm">
                            {emoji}
                          </div>
                          
                          {/* Row Actions */}
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => downloadNoteAsPDF(note)}
                              className="p-1 text-gray-350 hover:text-[#4A2711] rounded-md transition"
                              title="Download PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleBookmarkNote(note.id)}
                              className={`p-1 rounded-md transition ${note.isBookmarked ? 'text-amber-500' : 'text-gray-350 hover:text-amber-500'}`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${note.isBookmarked ? 'fill-amber-500' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                const confirmDelete = window.confirm(`Delete note "${note.title}"?`);
                                if (confirmDelete) handleDeleteNote(note.id);
                              }}
                              className="p-1 text-gray-355 hover:text-red-500 rounded-md transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-900 truncate leading-snug">{note.title}</h4>
                          <p className="text-[10px] text-gray-450 leading-relaxed mt-1.5 line-clamp-3">
                            {note.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3.5 border-t border-gray-100 mt-2 shrink-0">
                        <span className={`text-[9px] font-bold p-0.5 px-2 border rounded-full ${badgeColor}`}>
                          {note.subject}
                        </span>
                        <span className="text-[9px] text-gray-400 font-semibold">{note.createdOn}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center text-gray-400 font-medium text-xs">
                No notes found matching your search. Create one to get started!
              </div>
            )}

            {/* Load more button */}
            <div className="flex justify-center pt-2">
              <button className="text-[11px] text-[#4A2711] font-bold hover:underline flex items-center gap-1.5 bg-[#FAF6F0] p-2 px-4 rounded-xl border border-[#EADDC9]/60 shadow-sm transition">
                <ChevronDown className="w-3.5 h-3.5" />
                Load more notes
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Quick Tools & Import Settings */}
        <div className="w-72 border-l border-gray-200/50 bg-[#FCF9F5] p-5 hidden xl:flex flex-col space-y-5 overflow-y-auto shrink-0 z-0">
          
          {/* Card 0: Create Note Callout */}
          <button
            onClick={() => {
              setNewNoteTitle("");
              setNewNoteContent("");
              setShowCreateNoteModal(true);
            }}
            className="w-full py-3 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Note
          </button>

          {/* Card 1: Import notes */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-gray-905 font-serif">Import Notes</h3>
            <div className="text-[11px] space-y-1">
              <button
                onClick={triggerFileInput}
                className="w-full p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-between text-left transition font-semibold text-gray-700 bg-white"
              >
                <span className="flex items-center gap-2">📄 Upload PDF</span>
                <span className="text-gray-405 text-[10px] font-bold">&gt;</span>
              </button>
              <button
                onClick={triggerFileInput}
                className="w-full p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-between text-left transition font-semibold text-gray-700 bg-white"
              >
                <span className="flex items-center gap-2">🖼️ Upload Image</span>
                <span className="text-gray-405 text-[10px] font-bold">&gt;</span>
              </button>
              <button
                onClick={() => alert("Google Drive import integration.")}
                className="w-full p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-between text-left transition font-semibold text-gray-700 bg-white"
              >
                <span className="flex items-center gap-2">☁️ Import from Drive</span>
                <span className="text-gray-405 text-[10px] font-bold">&gt;</span>
              </button>
              <button
                onClick={() => alert("OneDrive import integration.")}
                className="w-full p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-between text-left transition font-semibold text-gray-700 bg-white"
              >
                <span className="flex items-center gap-2">💾 Import from OneDrive</span>
                <span className="text-gray-405 text-[10px] font-bold">&gt;</span>
              </button>
            </div>
          </div>

          {/* Card 2: Quick Tools */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-gray-905 font-serif">Quick Tools</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  if (notesHistory.length > 0) {
                    setSelectedNoteForView(notesHistory[0]);
                    handleNoteAIAction("summarize", notesHistory[0]);
                  } else {
                    alert("Create a note first before running tools!");
                  }
                }}
                className="w-full text-left flex items-start gap-2.5 hover:bg-gray-50 p-1.5 rounded-lg transition"
              >
                <span className="text-lg">🤖</span>
                <div>
                  <h4 className="text-[11px] font-bold text-gray-900">AI Summarize</h4>
                  <p className="text-[9px] text-gray-400 leading-normal mt-0.5">Summarize your notes instantly.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (notesHistory.length > 0) {
                    setSelectedNoteForView(notesHistory[0]);
                    handleNoteAIAction("explain", notesHistory[0]);
                  } else {
                    alert("Create a note first before running tools!");
                  }
                }}
                className="w-full text-left flex items-start gap-2.5 hover:bg-gray-50 p-1.5 rounded-lg transition"
              >
                <span className="text-lg">💡</span>
                <div>
                  <h4 className="text-[11px] font-bold text-gray-900">AI Explain</h4>
                  <p className="text-[9px] text-gray-400 leading-normal mt-0.5">Simplify tricky terminology.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (notesHistory.length > 0) {
                    setSelectedNoteForView(notesHistory[0]);
                    handleNoteAIAction("explain", notesHistory[0]);
                  } else {
                    alert("Create a note first before running tools!");
                  }
                }}
                className="w-full text-left flex items-start gap-2.5 hover:bg-gray-50 p-1.5 rounded-lg transition"
              >
                <span className="text-lg">🎴</span>
                <div>
                  <h4 className="text-[11px] font-bold text-gray-900">Flashcards</h4>
                  <p className="text-[9px] text-gray-400 leading-normal mt-0.5">Create key concept cards.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (notesHistory.length > 0) {
                    handleNoteConvertToQuiz(notesHistory[0]);
                  } else {
                    alert("Create a note first before converting!");
                  }
                }}
                className="w-full text-left flex items-start gap-2.5 hover:bg-gray-50 p-1.5 rounded-lg transition"
              >
                <span className="text-lg">❓</span>
                <div>
                  <h4 className="text-[11px] font-bold text-gray-900">Convert to Quiz</h4>
                  <p className="text-[9px] text-gray-400 leading-normal mt-0.5">Turn note contents into quiz.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Card 3: Storage Usage */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm text-xs">
            <h3 className="text-xs font-bold text-gray-900 font-serif">Storage Usage</h3>
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-150 rounded-full overflow-hidden">
                <div className="h-full bg-[#4A2711] transition-all duration-300" style={{ width: "24%" }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                <span>2.4 GB of 10 GB used</span>
                <span className="font-bold">24%</span>
              </div>
            </div>
            <button
              onClick={() => alert("Upgrade storage subscription modal.")}
              className="w-full py-2 bg-[#FAF6F0] border border-[#4A2711]/50 hover:bg-[#4A2711]/5 text-[#4A2711] text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1.5 mt-2"
            >
              👑 Upgrade for more space
            </button>
          </div>

        </div>

      </div>
    );
  };

  // Helper to render the interactive Quiz view
  const renderQuizTabContent = () => {
    // If playing an active quiz
    if (activePlayingQuiz) {
      const currentQuestion = activePlayingQuiz.questions[playingQuizCurrentIndex];
      const totalQuestions = activePlayingQuiz.questions.length;

      return (
        <div className="flex-grow p-6 overflow-y-auto bg-[#FCF9F5]">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Header / Back action */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActivePlayingQuiz(null)}
                className="text-xs font-bold text-[#4A2711] hover:underline flex items-center gap-1.5 bg-[#FAF6F0] p-2 px-4 rounded-xl border border-[#EADDC9]/60 shadow-sm"
              >
                ← Back to Quizzes
              </button>
              <div className="text-xs font-bold text-gray-500 bg-white p-2 px-4 rounded-xl border border-gray-200/50 shadow-sm">
                Topic: <span className="text-gray-900">{activePlayingQuiz.subject}</span>
              </div>
            </div>

            {/* Main active quiz card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Info banner */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-serif">{activePlayingQuiz.title}</h3>
                <p className="text-xs text-gray-450 mt-1">Select the correct option for each question to complete the challenge.</p>
              </div>

              {!playingQuizSubmitted ? (
                // ACTIVE QUIZ INTERACTION
                <div className="space-y-6">
                  {/* Progress info */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>Question {playingQuizCurrentIndex + 1} of {totalQuestions}</span>
                      <span>{Math.round(((playingQuizCurrentIndex + 1) / totalQuestions) * 100)}% Complete</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${((playingQuizCurrentIndex + 1) / totalQuestions) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Question box */}
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150/70">
                    <p className="text-xs font-bold text-gray-850 leading-relaxed">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Options list */}
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt: string, optIdx: number) => {
                      const isSelected = playingQuizAnswers[playingQuizCurrentIndex] === opt;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => selectPlayingQuizOption(opt)}
                          className={`w-full text-left p-4 rounded-xl border text-xs transition font-medium flex items-center justify-between ${
                            isSelected
                              ? "bg-[#4A2711]/10 border-[#4A2711] text-[#4A2711] font-bold shadow-sm"
                              : "bg-white border-gray-205 hover:bg-gray-50 text-gray-750"
                          }`}
                        >
                          <span>{opt}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected ? "border-[#4A2711] bg-[#4A2711] text-white" : "border-gray-305"
                          }`}>
                            {isSelected && "✓"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action row */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handlePlayingQuizNext}
                      disabled={!playingQuizAnswers[playingQuizCurrentIndex]}
                      className="px-6 py-3 bg-[#4A2711] hover:bg-[#5c3216] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      {playingQuizCurrentIndex < totalQuestions - 1 ? "Next Question →" : "Submit Quiz 🎉"}
                    </button>
                  </div>
                </div>
              ) : (
                // SUBMITTED RESULTS VIEW
                <div className="space-y-6">
                  {/* Score badge summary */}
                  <div className="bg-green-50/50 border border-green-200/50 p-6 rounded-2xl text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white font-bold text-2xl shadow-sm">
                      {playingQuizScore}/{totalQuestions}
                    </div>
                    <div>
                      <h4 className="font-bold text-green-950 font-serif text-lg">Quiz Complete!</h4>
                      <p className="text-xs text-green-700 mt-1">
                        You scored <span className="font-bold">{Math.round((playingQuizScore / totalQuestions) * 100)}%</span> accuracy on this challenge.
                      </p>
                    </div>
                  </div>

                  {/* Question review details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Questions Review</h4>
                    <div className="space-y-4">
                      {activePlayingQuiz.questions.map((q: any, idx: number) => {
                        const answer = playingQuizAnswers[idx];
                        const isCorrect = answer && answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                        return (
                          <div key={idx} className={`p-4 rounded-2xl border space-y-3 ${
                            isCorrect ? "bg-green-50/10 border-green-200" : "bg-red-50/10 border-red-250"
                          }`}>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-gray-800">Q{idx + 1}. {q.question}</span>
                              <span className={`text-[10px] font-bold p-1 px-2.5 rounded-full shrink-0 ${
                                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            
                            <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-gray-150">
                              <div>Your answer: <span className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{answer || "Not answered"}</span></div>
                              {!isCorrect && <div>Correct answer: <span className="text-green-600 font-bold">{q.correct_answer}</span></div>}
                            </div>

                            <p className="text-[10px] text-gray-500 italic bg-white p-2.5 rounded-lg border border-gray-100">
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setActivePlayingQuiz(null)}
                      className="px-6 py-3 bg-[#4A2711] hover:bg-[#5c3216] text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Return to Quiz Hub
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      );
    }

    // MAIN QUIZ LIST / HUB VIEW
    const attemptedList = quizHistory.filter(q => q.score !== null);
    const totalQuizzesTaken = 22 + attemptedList.length;
    
    let totalScoreObtained = 142;
    let totalQuestionsAttempted = 184;
    
    attemptedList.forEach(q => {
      const parts = q.score.split('/');
      totalScoreObtained += parseInt(parts[0]);
      totalQuestionsAttempted += parseInt(parts[1]);
    });

    const averageAccuracy = totalQuestionsAttempted > 0 
      ? Math.round((totalScoreObtained / totalQuestionsAttempted) * 100)
      : 76;

    // Filter list based on search and subject
    const filteredQuizzes = quizHistory.filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchQuizQuery.toLowerCase()) ||
                            quiz.subject.toLowerCase().includes(searchQuizQuery.toLowerCase());
      
      const matchesSubject = selectedSubjectFilter === "All" || 
                             quiz.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      
      return matchesSearch && matchesSubject;
    });

    return (
      <div className="flex-grow flex overflow-hidden bg-[#FCF9F5]">
        
        {/* Left Side: Quiz Creation options and List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 min-w-0">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Quiz</h1>
            <p className="text-xs text-gray-450 mt-1">Create quizzes to test your understanding and improve your learning.</p>
          </div>

          {/* Creation Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Generate from Chat */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-orange-50/50 border border-orange-200/50 flex items-center justify-center text-orange-600 text-sm font-bold">
                  📝
                </div>
                <h3 className="text-xs font-bold text-gray-900">Generate from Chat</h3>
                <p className="text-[10px] text-gray-450 leading-relaxed">Create a quiz from any of your past conversations.</p>
              </div>
              <button
                onClick={() => {
                  const latestConv = conversations[0];
                  if (latestConv) {
                    setNewQuizTopic(latestConv.title);
                    setNewQuizDifficulty("Easy");
                    setShowCreateQuizModal(true);
                  } else {
                    alert("Start a chat first before generating from history.");
                  }
                }}
                className="w-full py-1.5 border border-gray-250 hover:bg-gray-50 text-[11px] text-[#4A2711] font-semibold rounded-lg bg-white transition"
              >
                Select Chat
              </button>
            </div>

            {/* Card 2: Upload File */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-green-50/50 border border-green-200/50 flex items-center justify-center text-green-700 text-sm font-bold">
                  📤
                </div>
                <h3 className="text-xs font-bold text-gray-900">Upload a File</h3>
                <p className="text-[10px] text-gray-450 leading-relaxed">Upload notes, PDF or image and generate a quiz.</p>
              </div>
              <button
                onClick={triggerFileInput}
                className="w-full py-1.5 border border-gray-250 hover:bg-gray-50 text-[11px] text-[#4A2711] font-semibold rounded-lg bg-white transition"
              >
                Upload File
              </button>
            </div>

            {/* Card 3: Custom Quiz */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50/50 border border-blue-200/50 flex items-center justify-center text-blue-600 text-sm font-bold">
                  ✍️
                </div>
                <h3 className="text-xs font-bold text-gray-900">Custom Quiz</h3>
                <p className="text-[10px] text-gray-450 leading-relaxed">Create a quiz on any topic of your choice.</p>
              </div>
              <button
                onClick={() => {
                  setNewQuizTopic("");
                  setShowCreateQuizModal(true);
                }}
                className="w-full py-1.5 border border-gray-250 hover:bg-gray-50 text-[11px] text-[#4A2711] font-semibold rounded-lg bg-white transition"
              >
                Create Quiz
              </button>
            </div>

            {/* Card 4: Smart Quiz (AI) */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-[#4A2711]/5 border border-[#4A2711]/20 flex items-center justify-center text-[#4A2711] text-sm font-bold">
                  🧠
                </div>
                <h3 className="text-xs font-bold text-gray-900">Smart Quiz (AI)</h3>
                <p className="text-[10px] text-gray-450 leading-relaxed">Let AI pick important topics and create a quiz for you.</p>
              </div>
              <button
                onClick={() => {
                  setNewQuizTopic("Modern World History");
                  setNewQuizDifficulty("Medium");
                  setShowCreateQuizModal(true);
                }}
                className="w-full py-1.5 border border-gray-250 hover:bg-gray-50 text-[11px] text-[#4A2711] font-semibold rounded-lg bg-white transition"
              >
                Generate
              </button>
            </div>

          </div>

          {/* Your Quizzes Hub section */}
          <div className="space-y-4">
            
            {/* Header & filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-lg font-bold text-gray-950 font-serif">Your Quizzes</h2>
              
              {/* Search & Subject filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuizQuery}
                    onChange={(e) => setSearchQuizQuery(e.target.value)}
                    placeholder="Search quizzes..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-[#4A2711]"
                  />
                </div>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-gray-205 text-[11px] bg-white focus:outline-none font-medium cursor-pointer"
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>
            </div>

            {/* Quizzes List */}
            <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {filteredQuizzes.length > 0 ? (
                filteredQuizzes.map((quiz) => {
                  // Subject emojis
                  let emoji = "⚛️";
                  if (quiz.subject.toLowerCase().includes("computer")) emoji = "💻";
                  else if (quiz.subject.toLowerCase().includes("math")) emoji = "🔢";
                  else if (quiz.subject.toLowerCase().includes("biology")) emoji = "🌱";
                  
                  // Difficulty Badge color
                  let diffColor = "bg-green-50 text-green-700 border-green-200/50";
                  if (quiz.difficulty === "Medium") diffColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                  else if (quiz.difficulty === "Hard") diffColor = "bg-red-50 text-red-700 border-red-200/50";

                  return (
                    <div key={quiz.id} className="p-4 flex items-center justify-between text-xs hover:bg-gray-50/50 transition">
                      {/* Left: icon & title */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#FAF6F0] border border-[#EADDC9]/40 flex items-center justify-center text-sm shrink-0">
                          {emoji}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">{quiz.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 font-medium">{quiz.subject} &bull; {quiz.questionsCount} Questions</span>
                            <span className={`text-[9px] font-bold p-0.5 px-2 border rounded-full ${diffColor}`}>
                              {quiz.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle values */}
                      <div className="hidden sm:flex items-center gap-12 shrink-0 pr-6">
                        <div>
                          <div className="text-[10px] text-gray-400">Score</div>
                          <div className={`font-bold mt-0.5 ${quiz.score ? 'text-green-600' : 'text-gray-400'}`}>
                            {quiz.score || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">Created on</div>
                          <div className="text-gray-700 font-medium mt-0.5">{quiz.createdOn}</div>
                        </div>
                      </div>

                      {/* Right action button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {quiz.score && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-lg shrink-0">
                            ✓ Done ({quiz.score})
                          </span>
                        )}
                        <button
                          onClick={() => startQuizSession(quiz)}
                          className={`px-4 py-2 text-[11px] font-bold rounded-lg transition shadow-sm ${
                            quiz.score
                              ? "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 hover:text-[#4A2711]"
                              : "bg-[#4A2711] hover:bg-[#5c3216] text-white"
                          }`}
                        >
                          {quiz.score ? "Re-quiz" : "Start Quiz"}
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs font-medium">
                  No quizzes found matching filters.
                </div>
              )}
            </div>

            {/* Load more button */}
            <div className="flex justify-center pt-2">
              <button className="text-[11px] text-[#4A2711] font-bold hover:underline flex items-center gap-1.5 bg-[#FAF6F0] p-2 px-4 rounded-xl border border-[#EADDC9]/60 shadow-sm transition">
                <ChevronDown className="w-3.5 h-3.5" />
                Load more quizzes
              </button>
            </div>

          </div>

        </div>

        {/* Right Side: Statistics & Streaks */}
        <div className="w-72 border-l border-gray-200/50 bg-[#FCF9F5] p-5 hidden xl:flex flex-col space-y-5 overflow-y-auto shrink-0">
          
          {/* Card 1: Quiz Statistics */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-900 font-serif">Quiz Statistics</h3>
            
            {/* Circular Gauge */}
            <div className="flex flex-col items-center py-2 space-y-2">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* SVG Circular Progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#F3EFE9" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="#4A2711" strokeWidth="8" fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * averageAccuracy) / 100}
                          strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-gray-900">{averageAccuracy}%</span>
                  <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Avg Score</span>
                </div>
              </div>
            </div>

            {/* Stat rows */}
            <div className="text-[11px] space-y-2.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-gray-500">
                <span>📚 Quizzes Taken</span>
                <span className="font-bold text-gray-800">{totalQuizzesTaken}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>❓ Questions Attempted</span>
                <span className="font-bold text-gray-800">{totalQuestionsAttempted}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>✓ Correct Answers</span>
                <span className="font-bold text-gray-800">{totalScoreObtained}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>🎯 Accuracy</span>
                <span className="font-bold text-gray-800">{averageAccuracy}%</span>
              </div>
            </div>

          </div>

          {/* Card 2: Study Streak */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-gray-905 font-serif">Study Streak</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🔥</span>
              <div>
                <div className="text-lg font-bold text-gray-900">{streakCount} Days</div>
                <div className="text-[10px] text-gray-400 font-medium">Daily Streak Active</div>
              </div>
            </div>
            {/* Streak row */}
            <div className="flex justify-between pt-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                const isChecked = idx < 5; // Monday to Friday checked
                return (
                  <div key={idx} className="flex flex-col items-center space-y-1">
                    <span className="text-[9px] font-bold text-gray-400">{day}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border font-bold ${
                      isChecked
                        ? "bg-[#4A2711] text-white border-[#4A2711]"
                        : "bg-[#FCF9F5] text-gray-400 border-gray-200"
                    }`}>
                      {isChecked ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Suggestion banner */}
          <div className="bg-[#FAF6F0] border border-[#EADDC9]/50 rounded-2xl p-4 space-y-3 shadow-sm text-xs">
            <h4 className="font-bold text-[#4A2711] font-serif">Need a quiz on any topic?</h4>
            <p className="text-[10px] text-gray-550 leading-relaxed">
              Just ask, and we'll create a quiz customized for you.
            </p>
            <button
              onClick={() => {
                setNewQuizTopic("");
                setShowCreateQuizModal(true);
              }}
              className="w-full py-2 bg-[#FAF6F0] border border-[#4A2711]/50 hover:bg-[#4A2711]/5 text-[#4A2711] text-[11px] font-bold rounded-lg transition"
            >
              ✨ Create Custom Quiz
            </button>
          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="flex-grow bg-[#FCF9F5] text-gray-900 flex h-screen overflow-hidden font-sans selection:bg-[#4A2711]/10 selection:text-[#4A2711]">
      
      {/* Mobile Sidebar dimming backdrop overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`fixed md:relative inset-y-0 left-0 w-72 border-r border-gray-200/60 bg-white z-45 transform transition-transform duration-300 ease-in-out flex flex-col justify-between shrink-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="flex-grow flex flex-col min-h-0">
          
          {/* Logo / Naming */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4A2711] flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-950 font-serif">
                QuickSolv
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={startNewConversation}
              className="w-full py-3 px-4 bg-[#4A2711] hover:bg-[#5c3216] text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Nav List */}
          <nav className="px-3 space-y-0.5">
            {[
              { name: "Home", icon: HomeIcon },
              { name: "Quiz", icon: HelpCircle },
              { name: "Notes", icon: FileText },
              { name: "Study Plan", icon: Calendar },
              { name: "Settings", icon: SettingsIcon }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.name === "Home") {
                      setCurrentTab("Home");
                      startNewConversation();
                    } else {
                      setCurrentTab(item.name);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#FAF5EE] text-[#4A2711] font-bold"
                      : "text-gray-655 hover:bg-gray-50 hover:text-gray-950"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#4A2711]" : "text-gray-400"}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Recent Chats Section */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 mt-6">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
              <span>Recent Chats</span>
              <span className="text-[9px] font-semibold text-gray-400">{conversations.length}</span>
            </div>
            
            <div className="space-y-0.5">
              {conversations.map((conv) => {
                const displayTitle = getSmartChatTitle(conv.title, conv.description);
                const isActive = activeConvId === conv.id;

                return (
                  <div key={conv.id} className="relative group">
                    <div
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition duration-150 flex items-center justify-between text-xs font-medium cursor-pointer ${
                        isActive
                          ? "bg-[#FAF5EE] text-[#4A2711] font-semibold"
                          : "text-gray-650 hover:bg-gray-50 hover:text-gray-950"
                      }`}
                    >
                      <span className="truncate pr-2 flex-1">{displayTitle}</span>
                      
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-[9px] text-gray-400 group-hover:hidden">
                          {getRecentTimestamp(conv)}
                        </span>
                        
                        {/* Hover Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => {
                              setRenamingConv(conv);
                              setRenameInputTitle(conv.title || displayTitle);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 transition"
                            title="Rename chat heading"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingConv(conv);
                            }}
                            className="p-1 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-150/80 bg-white space-y-4">

          {/* User profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={profileData.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"}
                alt="Ananya Kumar profile"
                className="w-9 h-9 rounded-full object-cover border border-[#EADDC9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{profileData.fullName || "Ananya Kumar"}</div>
                <div className="text-[10px] text-gray-450 font-semibold mt-0.5">Free Plan</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentTab("Settings")}
                className="p-1.5 rounded hover:bg-gray-105 text-gray-400 hover:text-gray-700 transition"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-gray-105 text-gray-400 hover:text-gray-700 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
        
        {/* Workspace Top Header */}
        <header className="h-16 border-b border-gray-200/50 flex items-center justify-between px-6 bg-[#FCF9F5]/90 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Header Greeting */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 font-serif">
                Hello, {profileData.fullName ? profileData.fullName.split(" ")[0] : "Student"}! 👋
              </h2>
              <p className="text-[10px] text-gray-450 mt-0.5 font-medium">What are you learning today?</p>
            </div>
          </div>

          {/* Centered Upgrade to Pro button */}
          <div className="hidden md:flex justify-center flex-1">
            <button
              onClick={() => alert("QuickSolv Pro payment integration placeholder.")}
              className="px-3.5 py-1.5 bg-[#4A2711]/5 hover:bg-[#4A2711]/10 text-[#4A2711] border border-[#4A2711]/20 text-[10px] font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              👑 <span className="uppercase tracking-wider">Upgrade to Pro</span>
            </button>
          </div>

          {/* Top Center-Right controls */}
          <div className="flex items-center space-x-3.5">

            
            <button
              onClick={() => downloadStudyGuideAsPDF()}
              className="p-1.5 px-3 bg-[#4A2711]/5 hover:bg-[#4A2711]/10 border border-[#4A2711]/20 text-[#4A2711] text-[10px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Download Study Guide PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>



            {/* Sunshine theme toggle icon */}
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition" title="Toggle theme">
              <Sparkles className="w-4 h-4 text-gray-400" />
            </button>



            {/* Profile Pill */}
            <div className="relative">
              <div
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-gray-100/80 cursor-pointer transition select-none shrink-0 border border-gray-200/50 bg-white shadow-sm"
              >
                <img
                  src={profileData.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"}
                  alt="Profile photo"
                  className="w-6 h-6 rounded-full object-cover border border-[#EADDC9]"
                />
                <span className="text-[11px] font-bold text-gray-750 truncate hidden sm:inline-block max-w-[100px]">
                  {profileData.fullName || "Ananya Kumar"}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 hidden sm:inline-block" />
              </div>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2.5 z-55 animate-in fade-in slide-in-from-top-1 duration-150 text-xs">
                  {/* Header info */}
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2.5">
                    <img
                      src={profileData.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100"}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="truncate">
                      <div className="font-bold text-gray-900 leading-tight">{profileData.fullName || "Ananya Kumar"}</div>
                      <div className="text-[10px] text-gray-455 truncate mt-0.5">{profileData.emailAddress || "email@example.com"}</div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setCurrentTab("Profile");
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2 font-medium"
                    >
                      👤 View / Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("Settings");
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2 font-medium"
                    >
                      ⚙️ System Settings
                    </button>
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profileData, notesHistory, quizHistory }));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", "quicksolv_student_data.json");
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2 font-medium"
                    >
                      💾 Export Account Data
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold"
                    >
                      🚪 Logout Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* API Warning banners */}
        {devConfigError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 max-w-3xl mx-auto flex items-start gap-3 mt-4 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Gemini Key Missing</h4>
              <p className="text-xs">Add GEMINI_API_KEY to your `.env.local` to enable live responses.</p>
            </div>
          </div>
        )}

        {/* Central Workspace Canvas */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto flex">
          
          {currentTab === "Quiz" ? (
            renderQuizTabContent()
          ) : currentTab === "Notes" ? (
            renderNotesTabContent()
          ) : currentTab === "Profile" ? (
            renderProfileTabContent()
          ) : currentTab === "History" ? (
            renderHistoryTabContent()
          ) : currentTab === "Saved" ? (
            renderSavedTabContent()
          ) : currentTab === "Study Plan" ? (
            renderStudyPlanTabContent()
          ) : currentTab === "Settings" ? (
            renderSettingsTabContent()
          ) : (
            <>
              {/* Central Chat Column (Messages Stream + Bottom Input Bar) */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                
                {/* Main Feed Container */}
                <div className="flex-1 p-6 overflow-y-auto space-y-8 min-w-0">
            
            {/* If empty workspace, render dynamic greeting and text input card */}
            {messages.length === 0 && !isLoading && (
              <div className="max-w-xl mx-auto py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-10 h-10 rounded-full bg-[#FAF5EE] border border-[#E9DFD3] flex items-center justify-center text-[#4A2711]">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-serif text-gray-900">{getGreeting()}</h2>
                
                {/* Input Card */}
                <div className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm text-left focus-within:ring-2 focus-within:ring-[#4A2711]/20 focus-within:border-[#4A2711]/50 transition duration-200">
                  {attachedImage && (
                    <div className="p-2 rounded-xl bg-[#FAF6F0] border border-[#EADDC9]/50 inline-flex items-center gap-3 shadow-sm relative mb-3">
                      {attachedImageMime === "application/pdf" ? (
                        <div className="w-14 h-14 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-750 text-xs font-black font-sans shrink-0">
                          PDF
                        </div>
                      ) : (
                        <img
                          src={`data:${attachedImageMime || "image/png"};base64,${attachedImage}`}
                          alt="Attached screenshot preview"
                          className="w-14 h-14 rounded-lg object-cover border border-[#EADDC9]"
                        />
                      )}
                      <span className="text-[10px] font-bold text-gray-500 pr-6">
                        {attachedImageMime === "application/pdf" ? "PDF Document Attachment" : "Pasted Image Attachment"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedImage(null);
                          setAttachedImageMime(null);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-650 transition shadow"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    onPaste={handlePaste}
                    rows={3}
                    placeholder="Ask anything or upload notes..."
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none resize-none text-gray-800 placeholder-gray-400 py-1"
                  />
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                    <div className="flex items-center space-x-2">
                      <button type="button" onClick={triggerFileInput} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><Paperclip className="w-4 h-4" /></button>
                      <button type="button" onClick={startCamera} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><Camera className="w-4 h-4" /></button>
                    </div>
                    <button
                      type="submit"
                      onClick={(e) => handleSendMessage(e)}
                      disabled={!prompt && !attachedImage}
                      className="w-8 h-8 rounded-lg bg-[#4A2711] hover:bg-[#5c3216] text-white flex items-center justify-center transition"
                    >
                      <Send className="w-4 h-4 transform rotate-45 -translate-x-0.5 translate-y-0.5 fill-white text-[#4A2711]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active message exchange (matches user screenshot) */}
            {messages.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-8">
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";

                  if (isUser) {
                    return (
                      <div key={msg.id || index} className="flex flex-col items-end space-y-1">
                        <div className="bg-[#F7F2EB] text-gray-850 p-3.5 px-4 rounded-2xl rounded-tr-sm max-w-[85%] text-xs leading-relaxed shadow-sm flex items-center gap-2">
                          <span>{msg.content}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 px-1.5 flex items-center gap-1">
                          {formatMessageTime(msg)} <Check className="w-2.5 h-2.5 text-[#4A2711]" />
                        </div>
                      </div>
                    );
                  }

                  // Parse Assistant responses
                  let study: GeminiStudyResponse | null = null;
                  let parseFailed = false;
                  try {
                    study = JSON.parse(msg.content);
                  } catch (err) {
                    parseFailed = true;
                  }

                  if (msg.mode === "chat" || parseFailed || !study) {
                    let textContent = msg.content;
                    if (study) {
                      if (study.coding_mode) {
                        textContent = `${study.coding_mode.purpose || ""}\n\n### 💻 Input Code:\n\`\`\`${study.coding_mode.language || "python"}\n${study.coding_mode.code || ""}\n\`\`\`\n\n### 🖥️ Expected Output:\n\`\`\`bash\n${study.coding_mode.output || ""}\n\`\`\``;
                        if (study.coding_mode.improved_version) {
                          textContent += `\n\n### 🛠️ Refactored / Improved Version:\n\`\`\`${study.coding_mode.language || "python"}\n${study.coding_mode.improved_version}\n\`\`\``;
                        }
                      } else if (study.math_mode) {
                        textContent = `### Math Problem Solver:\n\n**Given:** ${Array.isArray(study.math_mode.given) ? study.math_mode.given.join(", ") : study.math_mode.given || ""}\n\n**To Find:** ${study.math_mode.to_find || ""}\n\n**Formula:** ${study.math_mode.formula || ""}\n\n**Calculation:**\n${study.math_mode.calculation || ""}\n\n**Answer:** ${study.math_mode.answer || ""}`;
                      } else if (study.how_to_mode) {
                        const steps = study.how_to_mode.steps ? study.how_to_mode.steps.map((s: any) => `**Step ${s.step_num || s.step}: ${s.title || ""}**\n- *Action:* ${s.action || ""}\n- *Why:* ${s.why || ""}`).join("\n\n") : "";
                        textContent = `### How-To Guide:\n\n**Prerequisites:** ${study.how_to_mode.step_0_prerequisites || ""}\n\n${steps}\n\n**Troubleshooting:** ${study.how_to_mode.step_5_troubleshoot || ""}`;
                      } else if (study.comparison_mode) {
                        textContent = `### Comparison Verdict:\n${study.comparison_mode.verdict || ""}`;
                      } else if (study.hackathon_mode) {
                        textContent = `### Hackathon MVP Blueprint:\n\n**Problem:** ${study.hackathon_mode.problem || ""}\n\n**Proposed Solution:** ${study.hackathon_mode.proposed_solution || ""}\n\n**Deployment:** ${study.hackathon_mode.deployment || ""}`;
                      } else {
                        textContent = study.normal_solution || study.quick_answer || msg.content;
                      }
                    }
                    if (streamingMessageId && (msg.id === streamingMessageId || (streamingMessageId === "last-msg" && index === messages.length - 1))) {
                      textContent = streamingText;
                    }
                    return (
                      <div key={msg.id || index} className="space-y-4 max-w-4xl">
                        {/* Avatar header */}
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FAF5EE] border border-[#E9DFD3] flex items-center justify-center text-[#4A2711]">
                            <GraduationCap className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-gray-900">QuickSolv AI</div>
                            <div className="text-[9px] text-gray-400 font-semibold mt-0.5">{formatMessageTime(msg)}</div>
                          </div>
                        </div>
                        <div className="pl-10">
                          <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-sm text-gray-850 font-sans leading-relaxed space-y-1.5">
                            <div dangerouslySetInnerHTML={renderRichMarkdown(textContent)} className="space-y-1.5" />

                            {/* Bottom-right Action Bar for Copy & Real PDF Download */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100/80 mt-3 text-xs select-none">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(msg.id || `msg-${index}`, textContent)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200/80 bg-gray-50/50 hover:bg-gray-100 text-[11px] font-semibold text-gray-600 hover:text-gray-900 transition shadow-2xs cursor-pointer"
                                title="Copy reply text"
                              >
                                {copiedSection === (msg.id || `msg-${index}`) ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-green-600 font-bold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadMessageAsPDF(study?.topic || "QuickSolv Response", textContent)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#4A2711]/20 bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[11px] font-semibold text-[#4A2711] transition shadow-2xs cursor-pointer"
                                title="Download response as PDF"
                              >
                                <Download className="w-3.5 h-3.5 text-[#4A2711]" />
                                <span>Download PDF</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id || index} className="space-y-4">
                      
                      {/* Avatar header */}
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#FAF5EE] border border-[#E9DFD3] flex items-center justify-center text-[#4A2711]">
                          <GraduationCap className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-gray-900">QuickSolv AI</div>
                          <div className="text-[9px] text-gray-400 font-semibold mt-0.5">{formatMessageTime(msg)}</div>
                        </div>
                      </div>

                      {/* 📊 REAL POWERPOINT PRESENTATION (.PPTX) FORMAT CARD */}
                      {(study.presentation || (msg.mode === "presentation" || (prompt && (prompt.toLowerCase().includes("ppt") || prompt.toLowerCase().includes("presentation") || prompt.toLowerCase().includes("slide"))))) && (
                        <div className="pl-10 max-w-5xl mb-6">
                          <div className="bg-[#FAF5EE] border-2 border-[#EADDC9] rounded-3xl p-6 space-y-5 shadow-md font-sans">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#EADDC9] pb-4">
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-[#4A2711] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                                  📊
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-gray-900 font-serif">
                                      {cleanMarkdownText(study.presentation?.topic || study.topic || "PowerPoint Presentation")}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                      100% Real PPTX Format
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    Interactive Slide Deck • {study.presentation?.slides?.length || 5} Professional Slides
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadPptx(study.presentation?.topic || study.topic || "Presentation", study)}
                                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#4A2711] hover:bg-[#381d0c] text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-amber-300" />
                                <span>Download 100% Real PPTX 📥</span>
                              </button>
                            </div>

                            {/* Slide Previews Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(study.presentation?.slides || [
                                { title: `Introduction to ${cleanMarkdownText(study.topic || "Topic")}`, subtitle: "Overview & Core Foundations", bulletPoints: (study.important_points?.slice(0, 3) || ["Core definition and principle", "Primary objective", "Key structural framework"]).map(p => cleanMarkdownText(p)), keyTakeaway: cleanMarkdownText(study.easy_explanation || "Main overview of topic") },
                                { title: "Key Principles & Detailed Analysis", subtitle: "Core Technical Concepts", bulletPoints: (study.important_points?.slice(3, 6) || ["Technical detail and system behavior", "Core architectural requirement", "Primary operational rule"]).map(p => cleanMarkdownText(p)), keyTakeaway: cleanMarkdownText(study.memory_trick || "Solution principle") },
                                { title: "Technical Formulas & Step Execution", subtitle: "Mathematical & Algorithmic Breakdown", bulletPoints: (study.formulas?.map((f: any) => `${f.formula}: ${f.meaning}`) || ["Step 1 implementation", "Step 2 execution", "Validation and checks"]).map(p => cleanMarkdownText(p)), keyTakeaway: "Verified mathematical proof and execution" },
                                { title: "Real-World Applications & Scenarios", subtitle: "Practical Case Studies", bulletPoints: (study.examples?.map((e: any) => `${e.scenario} - ${e.explanation}`) || ["Practical application in production", "Real-world usage scenario", "Expected outcome"]).map(p => cleanMarkdownText(p)), keyTakeaway: "Practical impact and deployment" },
                                { title: "Summary & Actionable Next Steps", subtitle: "Key Takeaways & Conclusion", bulletPoints: (study.common_mistakes?.map((m: string) => `Avoid: ${cleanMarkdownText(m)}`) || ["Review core principles", "Execute step-by-step instructions", "Verify final results"]).map(p => cleanMarkdownText(p)), keyTakeaway: "Actionable conclusion and final steps" }
                              ]).map((slide: any, sIdx: number) => {
                                const cleanTitle = cleanMarkdownText(slide.title);
                                const cleanSub = cleanMarkdownText(slide.subtitle || "");
                                const cleanTakeaway = cleanMarkdownText(slide.keyTakeaway || "");

                                return (
                                  <div key={sIdx} className="bg-white border border-[#EADDC9] rounded-2xl p-4.5 space-y-2.5 shadow-2xs relative">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                      <span>Slide {sIdx + 1}</span>
                                      <span className="text-[#4A2711] font-semibold">PowerPoint</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm font-serif leading-snug">{cleanTitle}</h4>
                                    {cleanSub && <p className="text-xs text-gray-500 italic font-sans">{cleanSub}</p>}
                                    <ul className="text-xs text-gray-700 space-y-1.5 pl-4 list-disc font-sans leading-relaxed">
                                      {slide.bulletPoints?.map((bp: string, bIdx: number) => (
                                        <li key={bIdx}>{cleanMarkdownText(bp)}</li>
                                      ))}
                                    </ul>
                                    {cleanTakeaway && (
                                      <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-medium text-amber-950 font-sans">
                                        💡 <span className="font-bold text-amber-900">Key Takeaway:</span> {cleanTakeaway}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stack of themed study cards (Accordion) or Research Paper */}
                      {study.research_paper ? (
                        <div className="pl-10 max-w-5xl">
                          <div className="flex flex-col md:flex-row gap-5 bg-white border border-gray-200/80 rounded-2xl shadow-md overflow-hidden font-serif text-gray-800">
                            
                            {/* Left Column: Quick-Recall Q&A Cues */}
                            <div className="md:w-64 bg-[#FAF6F0]/30 border-b md:border-b-0 md:border-r border-gray-200/80 p-5 font-sans shrink-0">
                              <h3 className="text-xs font-bold text-[#4A2711] uppercase tracking-wider mb-4 border-b border-gray-200/80 pb-2">
                                🔑 Q&A Cue Column
                              </h3>
                              <div className="text-[10px] text-gray-400 mb-4 italic leading-relaxed">
                                Cover the main summary panel and try to answer these questions from memory to test active recall:
                              </div>
                              <ul className="space-y-4">
                                {study.research_paper.cues.map((cue, cIdx) => (
                                  <li key={cIdx} className="space-y-1">
                                    <div className="text-[11px] font-bold text-gray-700 leading-snug">
                                      {cue}
                                    </div>
                                    <button
                                      onClick={() => alert(`Self-test clue active recall hint: Look under section ${cIdx + 1} of the summary sheet.`)}
                                      className="text-[9px] text-[#4A2711] font-semibold hover:underline"
                                    >
                                      Reveal Clue Reference
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Right Main Column: Summary content */}
                            <div className="flex-1 p-6 space-y-6">
                              
                              {/* Header & Citation info */}
                              <div className="space-y-2 border-b border-gray-200 pb-4">
                                <span className="text-[9px] font-bold text-gray-400 font-sans uppercase tracking-widest">The One-Page Visual Paper Summary (Cornell Format)</span>
                                <h2 className="text-base font-bold text-gray-900 leading-snug font-serif">{study.research_paper.citation}</h2>
                                <p className="text-[10px] text-gray-500 italic mt-1 font-sans">
                                  <strong>Why I'm reading this:</strong> {study.research_paper.why_reading}
                                </p>
                              </div>

                              {/* 1. One-Sentence Takeaway */}
                              <div className="bg-[#FAF6F0] border-l-4 border-[#4A2711] p-4 rounded-r-xl space-y-1">
                                <h4 className="text-[10px] font-bold text-[#4A2711] font-sans uppercase tracking-wider">One-Sentence Takeaway</h4>
                                <p className="text-xs leading-relaxed font-serif italic text-gray-800">
                                  "{study.research_paper.takeaway}"
                                </p>
                              </div>

                              {/* 2. Problem & Background */}
                              <div className="space-y-1.5">
                                <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">1. Problem / Background Context</h4>
                                <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650">{study.research_paper.background}</p>
                              </div>

                              {/* 3. Methodology & Diagram */}
                              {(() => {
                                const images = getResearchImages(study.topic || study.research_paper.citation);
                                return (
                                  <div className="space-y-3">
                                    <div className="space-y-1.5">
                                      <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">2. Methodology & Diagram</h4>
                                      <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650 font-serif">{study.research_paper.methodology_text}</p>
                                    </div>
                                    <div className="border border-gray-150 p-2 rounded-xl bg-white shadow-xs max-w-md select-none">
                                      <img
                                        src={images.methodology}
                                        alt="Methodology Diagram"
                                        className="w-full aspect-[16/9] object-cover rounded-lg"
                                      />
                                      <div className="text-[9px] text-gray-400 text-center italic mt-1.5 font-sans">
                                        Figure 1: Methodology system flowchart / pipeline diagram
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 4. Key Results & Chart */}
                              {(() => {
                                const images = getResearchImages(study.topic || study.research_paper.citation);
                                return (
                                  <div className="space-y-3">
                                    <div className="space-y-1.5">
                                      <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">3. Key Results & Performance Chart</h4>
                                      <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650 font-serif">{study.research_paper.results_text}</p>
                                    </div>
                                    <div className="border border-gray-150 p-2 rounded-xl bg-white shadow-xs max-w-md select-none">
                                      <img
                                        src={images.results}
                                        alt="Results Chart"
                                        className="w-full aspect-[16/9] object-cover rounded-lg"
                                      />
                                      <div className="text-[9px] text-gray-400 text-center italic mt-1.5 font-sans">
                                        Figure 2: Performance benchmark metrics / results plot
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 5. Visual Summary Sketch Box */}
                              {(() => {
                                const images = getResearchImages(study.topic || study.research_paper.citation);
                                return (
                                  <div className="space-y-3">
                                    <div className="space-y-1.5">
                                      <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">4. Visual Summary Sketch Box (Graphical Abstract)</h4>
                                      <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650 font-serif">{study.research_paper.sketch_desc}</p>
                                    </div>
                                    <div className="border border-gray-150 p-2 rounded-xl bg-white shadow-xs max-w-md select-none">
                                      <img
                                        src={images.sketch}
                                        alt="Visual Summary Sketch"
                                        className="w-full aspect-[16/9] object-cover rounded-lg"
                                      />
                                      <div className="text-[9px] text-gray-400 text-center italic mt-1.5 font-sans">
                                        Figure 3: Graphical abstract overview / concept sketch box
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 6. Limitations */}
                              <div className="space-y-1.5 bg-red-50/5 border border-red-200/50 p-4 rounded-xl">
                                <h4 className="text-[11px] font-bold text-red-800 font-sans uppercase tracking-wider">5. Limitations & Caveats</h4>
                                <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650 font-serif">{study.research_paper.limitations}</p>
                              </div>

                              {/* 7. Personal Interpretation */}
                              <div className="space-y-1.5">
                                <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">6. Personal Interpretation & Integration</h4>
                                <p className="text-xs leading-relaxed whitespace-pre-line text-gray-650 font-serif">{study.research_paper.interpretation}</p>
                              </div>

                              {/* 8. Key Terms Glossary */}
                              {study.research_paper.glossary && study.research_paper.glossary.length > 0 && (
                                <div className="space-y-2 border-t border-gray-150 pt-4">
                                  <h4 className="text-[11px] font-bold text-gray-900 font-sans uppercase tracking-wider">7. Key Terms Glossary</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    {study.research_paper.glossary.map((item, gIdx) => (
                                      <div key={gIdx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
                                        <div className="font-sans font-bold text-gray-800 text-[10.5px]">{item.term}</div>
                                        <div className="text-gray-500 text-[10px] leading-relaxed font-serif">{item.definition}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="border-t border-gray-150 pt-4 flex items-center gap-4 select-none font-sans text-xs">
                                <button
                                  onClick={() => {
                                    const copyText = `CITATION:\n${study.research_paper?.citation}\n\nTAKEAWAY:\n${study.research_paper?.takeaway}\n\nBACKGROUND:\n${study.research_paper?.background}\n\nMETHODOLOGY:\n${study.research_paper?.methodology_text}\n\nRESULTS:\n${study.research_paper?.results_text}\n\nLIMITATIONS:\n${study.research_paper?.limitations}`;
                                    navigator.clipboard.writeText(copyText);
                                    alert("Copied summary sheet!");
                                  }}
                                  className="text-gray-500 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                >
                                  📋 Copy Summary Sheet
                                </button>
                                <button
                                  onClick={() => downloadResearchPaperAsPDF(study)}
                                  className="text-[#4A2711] hover:text-[#5c3216] font-bold flex items-center gap-1 transition"
                                >
                                  📥 Download Cornell Summary PDF
                                </button>
                              </div>

                            </div>
                          </div>
                        </div>
                      ) : study.sections ? (
                        <div className="pl-10 max-w-4xl space-y-4">
                          
                          {/* Optional header */}
                          <div className="border-b border-gray-150 pb-2">
                            <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest font-sans">
                              {study.intent || "AI RESOURCE OUTPUT"} &bull; {study.level || "INTERMEDIATE"} LEVEL
                            </span>
                            <h2 className="text-base font-bold text-gray-900 mt-0.5 font-serif">
                              {study.topic}
                            </h2>
                          </div>

                          {study.sections.map((sec: any, sIdx: number) => {
                            const type = sec.type;
                            return (
                              <div key={sIdx} className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                                
                                {/* Card Header */}
                                <div className="p-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                  <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                    {type === "quick_answer" && <span className="text-orange-500 text-sm">⚡</span>}
                                    {type === "explanation" && <span className="text-green-600 text-sm">🟢</span>}
                                    {type === "steps" && <span className="text-blue-500 text-sm">🏁</span>}
                                    {type === "example" && <span className="text-indigo-500 text-sm">💡</span>}
                                    {type === "formula" && <span className="text-purple-500 text-sm">📐</span>}
                                    {type === "code" && <span className="text-gray-600 text-sm">💻</span>}
                                    {type === "table" && <span className="text-cyan-500 text-sm">⚖️</span>}
                                    {type === "diagram" && <span className="text-pink-500 text-sm">🧱</span>}
                                    {type === "warning" && <span className="text-red-500 text-sm">⚠️</span>}
                                    {type === "practice" && <span className="text-amber-500 text-sm">✏️</span>}
                                    {type === "sources" && <span className="text-emerald-500 text-sm">📖</span>}
                                    {sec.title}
                                  </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5 text-sm text-gray-800 leading-relaxed font-sans">
                                  
                                  {/* Type mappings */}
                                  {type === "quick_answer" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)}
                                      className="text-gray-900 bg-[#FAF6F0] p-4.5 rounded-xl border border-[#EADDC9]/50 font-sans text-sm space-y-2"
                                    />
                                  )}

                                  {type === "explanation" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)} 
                                      className="font-sans leading-relaxed text-sm space-y-2" 
                                    />
                                  )}

                                  {type === "steps" && (
                                    <div className="space-y-3.5 font-sans">
                                      {sec.items ? (
                                        sec.items.map((item: string, iIdx: number) => (
                                          <div key={iIdx} className="flex gap-3 text-sm">
                                            <div className="w-6 h-6 bg-[#4A2711] text-white font-bold flex items-center justify-center rounded-full shrink-0 text-xs shadow-sm">
                                              {iIdx + 1}
                                            </div>
                                            <div 
                                              dangerouslySetInnerHTML={renderRichMarkdown(item)} 
                                              className="text-gray-800 pt-0.5 space-y-2 flex-1 leading-relaxed" 
                                            />
                                          </div>
                                        ))
                                      ) : (
                                        <div dangerouslySetInnerHTML={renderRichMarkdown(sec.content)} className="text-gray-800 space-y-2 text-sm leading-relaxed" />
                                      )}
                                    </div>
                                  )}

                                  {type === "example" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)}
                                      className="bg-[#FAF6F0]/20 border border-[#EADDC9]/30 p-4.5 rounded-xl italic text-sm text-gray-800 space-y-2 font-sans leading-relaxed"
                                    />
                                  )}

                                  {type === "formula" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)}
                                      className="py-3 bg-gray-50 border border-gray-150 rounded-xl font-mono text-center text-sm text-gray-800 space-y-1.5"
                                    />
                                  )}

                                  {type === "code" && (
                                    <div className="space-y-2.5 font-sans">
                                      {sec.code && (
                                        <pre className="bg-gray-950 text-gray-100 p-4.5 rounded-xl font-mono text-[12px] overflow-x-auto leading-relaxed">
                                          {sec.code}
                                        </pre>
                                      )}
                                      {sec.content && (
                                        <div 
                                          dangerouslySetInnerHTML={renderRichMarkdown(sec.content)} 
                                          className="text-sm text-gray-700 pt-1 space-y-2" 
                                        />
                                      )}
                                    </div>
                                  )}

                                  {type === "table" && sec.headers && sec.rows && (
                                    <div className="overflow-x-auto border border-gray-150 rounded-xl font-sans">
                                      <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                          <tr className="bg-gray-50 border-b border-gray-150 text-[11px] font-bold text-gray-550 uppercase">
                                            {sec.headers.map((h: string, hIdx: number) => (
                                              <th key={hIdx} className="p-3.5">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-800">
                                          {sec.rows.map((row: string[], rIdx: number) => (
                                            <tr key={rIdx} className="hover:bg-gray-50/50">
                                              {row.map((cell: string, cIdx: number) => (
                                                <td key={cIdx} className="p-3.5 leading-relaxed">{cell}</td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {type === "diagram" && (
                                    <div className="p-4.5 bg-gray-50 rounded-xl border border-gray-150 text-center font-mono text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                      {sec.content}
                                    </div>
                                  )}

                                  {type === "warning" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)}
                                      className="bg-red-50/40 border border-red-200/50 p-4.5 rounded-xl text-red-955 font-sans text-sm space-y-2 leading-relaxed"
                                    />
                                  )}

                                  {type === "practice" && (
                                    <div 
                                      dangerouslySetInnerHTML={renderRichMarkdown(sec.content)}
                                      className="bg-amber-50/30 border border-amber-250/30 p-4.5 rounded-xl text-gray-800 font-sans text-sm space-y-2 leading-relaxed"
                                    />
                                  )}

                                  {type === "sources" && (
                                    <div className="font-sans text-sm">
                                      {sec.items ? (
                                        <ul className="list-decimal list-inside space-y-1.5 text-gray-700">
                                          {sec.items.map((src: string, sIdx: number) => (
                                            <li key={sIdx} dangerouslySetInnerHTML={renderRichMarkdown(src)} className="text-xs leading-relaxed inline-block w-full" />
                                          ))}
                                        </ul>
                                      ) : (
                                        <div dangerouslySetInnerHTML={renderRichMarkdown(sec.content)} className="text-gray-700 space-y-1.5" />
                                      )}
                                    </div>
                                  )}

                                </div>

                              </div>
                            );
                          })}

                          {/* Action Bar for Copy & Download PDF */}
                          <div className="flex items-center justify-end gap-2 pt-2 text-xs select-none">
                            <button
                              type="button"
                              onClick={() => {
                                const fullText = study.sections?.map((s: any) => `${s.title}:\n${s.content || s.code || ""}`).join("\n\n") || "";
                                copyToClipboard(msg.id || `msg-${index}`, fullText);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 transition shadow-xs cursor-pointer"
                              title="Copy response text"
                            >
                              {copiedSection === (msg.id || `msg-${index}`) ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                  <span className="text-green-600 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const fullText = study.sections?.map((s: any) => `${s.title}:\n${s.content || s.code || ""}`).join("\n\n") || "";
                                downloadMessageAsPDF(study.topic || "QuickSolv Response", fullText);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4A2711]/20 bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[11px] font-semibold text-[#4A2711] transition shadow-xs cursor-pointer"
                              title="Download response as PDF"
                            >
                              <Download className="w-3.5 h-3.5 text-[#4A2711]" />
                              <span>Download PDF</span>
                            </button>
                          </div>

                        </div>
                      ) : study.hackathon_mode ? (
                        <div className="pl-10 max-w-5xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-6">
                            
                            {/* Academic Title */}
                            <div className="border-b border-gray-150 pb-4">
                              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">
                                🚀 Hackathon Mode / Maximum Practical Guidance
                              </span>
                              <h2 className="text-base font-bold text-gray-900 mt-1 font-serif">
                                {study.topic}
                              </h2>
                            </div>

                            {/* 1. Problem & Objectives */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl space-y-1">
                                <h4 className="font-bold text-red-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                  ⚠️ 1. Problem Statement
                                </h4>
                                <p className="text-xs text-gray-750 leading-relaxed font-serif">
                                  {study.hackathon_mode.problem}
                                </p>
                                <div className="text-[10px] text-gray-400 mt-1">
                                  <strong>Impacted Users:</strong> {study.hackathon_mode.users}
                                </div>
                              </div>

                              <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl space-y-1">
                                <h4 className="font-bold text-green-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                  🎯 2. Project Objective
                                </h4>
                                <p className="text-xs text-gray-750 leading-relaxed font-serif">
                                  {study.hackathon_mode.objective}
                                </p>
                              </div>
                            </div>

                            {/* 2. Proposed Solution */}
                            <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl space-y-1.5">
                              <h4 className="font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                                💡 3. Proposed Solution
                              </h4>
                              <p className="text-xs text-gray-750 leading-relaxed font-serif">
                                {study.hackathon_mode.proposed_solution}
                              </p>
                            </div>

                            {/* 3. Features matrix */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                🛠️ 4. Feature Release Matrix
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1">
                                  <div className="font-bold text-red-800 text-[10px] uppercase">Must-Have (MVP)</div>
                                  <ul className="list-disc list-inside text-gray-650 space-y-0.5 text-[10.5px]">
                                    {study.hackathon_mode.features.must_have.map((f, i) => <li key={i}>{f}</li>)}
                                  </ul>
                                </div>
                                <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1">
                                  <div className="font-bold text-amber-800 text-[10px] uppercase">Nice-to-Have</div>
                                  <ul className="list-disc list-inside text-gray-650 space-y-0.5 text-[10.5px]">
                                    {study.hackathon_mode.features.nice_to_have.map((f, i) => <li key={i}>{f}</li>)}
                                  </ul>
                                </div>
                                <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1">
                                  <div className="font-bold text-blue-800 text-[10px] uppercase">Future Scope</div>
                                  <ul className="list-disc list-inside text-gray-650 space-y-0.5 text-[10.5px]">
                                    {study.hackathon_mode.features.future.map((f, i) => <li key={i}>{f}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>

                            {/* 4. Architecture map */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                🧱 5. Visual System Architecture
                              </h4>
                              <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-center font-mono text-[10.5px] text-gray-700 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {study.hackathon_mode.architecture}
                              </div>
                            </div>

                            {/* 5. Tech Stack Table */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                💻 6. Recommended Tech Stack
                              </h4>
                              <div className="overflow-x-auto border border-gray-150 rounded-xl">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-455 uppercase">
                                      <th className="p-3">Technology</th>
                                      <th className="p-3">Role / Purpose</th>
                                      <th className="p-3">Free Tier Status</th>
                                      <th className="p-3">Alternatives</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-gray-750">
                                    {study.hackathon_mode.tech_stack.map((t, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="p-3 font-bold text-gray-900">{t.tech}</td>
                                        <td className="p-3 leading-relaxed">{t.purpose}</td>
                                        <td className="p-3 font-medium text-amber-800">{t.free_tier}</td>
                                        <td className="p-3 text-gray-400">{t.alternatives}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 6. Database schema */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                💾 7. Database Entity Schema
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                                {study.hackathon_mode.database_design.map((db, i) => (
                                  <div key={i} className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1">
                                    <div className="font-bold text-gray-900 text-[10.5px]">Table: {db.table}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">Fields: {db.fields}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">Relation: {db.relationships}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 7. APIs Endpoints */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                🔌 8. REST API Endpoints
                              </h4>
                              <div className="grid grid-cols-1 gap-2.5 text-xs">
                                {study.hackathon_mode.apis.map((api, idx) => (
                                  <div key={idx} className="bg-gray-50 border border-gray-150 p-3 rounded-xl flex flex-col md:flex-row justify-between gap-3">
                                    <div>
                                      <span className="font-bold text-red-800 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[9.5px] uppercase">{api.endpoint.split(" ")[0]}</span>
                                      <span className="font-mono font-bold text-gray-900 ml-2 text-[10.5px]">{api.endpoint.split(" ").slice(1).join(" ")}</span>
                                      <p className="text-[10px] text-gray-550 mt-1 leading-relaxed">{api.purpose}</p>
                                    </div>
                                    <div className="text-right text-[9.5px] font-mono text-gray-400 leading-tight">
                                      <div>Input: {api.input}</div>
                                      <div className="mt-0.5">Output: {api.output}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 8. UI Flow & Steps */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-1.5">
                                <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                  🎨 9. Page Screens & UI Flow
                                </h4>
                                <p className="text-xs text-gray-750 leading-relaxed font-serif">
                                  {study.hackathon_mode.ui_flow}
                                </p>
                              </div>

                              <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-1.5">
                                <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                  🏁 10. Direct Implementation Steps
                                </h4>
                                <ol className="list-decimal list-inside text-xs text-gray-750 space-y-1 font-serif">
                                  {study.hackathon_mode.exact_steps.map((s, i) => <li key={i}>{s}</li>)}
                                </ol>
                              </div>
                            </div>

                            {/* 9. Deployment, Testing, Demo Script */}
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <h5 className="font-bold text-gray-850 text-[10.5px]">🚀 11. Deployment Pipeline</h5>
                                  <p className="text-xs text-gray-550 leading-relaxed">{study.hackathon_mode.deployment}</p>
                                </div>
                                <div className="space-y-1">
                                  <h5 className="font-bold text-gray-850 text-[10.5px]">🧪 12. Verification & Testing</h5>
                                  <p className="text-xs text-gray-550 leading-relaxed">{study.hackathon_mode.testing}</p>
                                </div>
                              </div>

                              <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl space-y-1">
                                <h5 className="font-bold text-amber-900 text-[10.5px]">📣 13. Judge-Friendly Presentation Script</h5>
                                <p className="text-xs text-gray-700 italic leading-relaxed font-serif">
                                  "{study.hackathon_mode.demo_script}"
                                </p>
                              </div>
                            </div>

                            {/* 10. Judge Q&A Simulator */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                💬 14. Predicted Judge Q&A Simulator
                              </h4>
                              <div className="grid grid-cols-1 gap-2.5">
                                {study.hackathon_mode.judge_q_and_a.map((qa, i) => (
                                  <div key={i} className="border border-gray-150 rounded-xl p-3 bg-white space-y-1.5 shadow-2xs">
                                    <div className="font-bold text-gray-850 text-[10.5px] flex items-center gap-2">
                                      <span className="text-amber-500">Q:</span> {qa.question}
                                    </div>
                                    <div className="text-xs text-gray-650 leading-relaxed border-l-2 border-amber-500/40 pl-3 font-serif">
                                      <strong>Strategy:</strong> {qa.answer}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 11. Limitations & Future Scope */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                              <div className="space-y-1">
                                <h5 className="font-bold text-gray-850 text-[10.5px] text-red-800">⚠️ 15. Simulated Prototypes Limits</h5>
                                <p className="text-[11px] text-gray-550 leading-relaxed">{study.hackathon_mode.limitations}</p>
                              </div>
                              <div className="space-y-1">
                                <h5 className="font-bold text-gray-850 text-[10.5px] text-blue-800">🔮 16. Future Roadmap Scaling</h5>
                                <p className="text-[11px] text-gray-550 leading-relaxed">{study.hackathon_mode.future_scope}</p>
                              </div>
                            </div>

                          </div>
                        </div>
                      ) : study.study_notes_mode ? (
                        <div className="pl-10 max-w-5xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-serif text-gray-800 space-y-6">
                            
                            {/* Header info */}
                            <div className="border-b border-gray-150 pb-4 text-center">
                              <span className="text-[9px] font-extrabold text-[#4A2711] uppercase tracking-widest font-sans">
                                📖 Study Notes Mode &bull; Exam Prep Layout
                              </span>
                              <h2 className="text-lg font-bold text-gray-900 mt-1">
                                {study.topic}
                              </h2>
                            </div>

                            {/* 1. Definition */}
                            <div className="space-y-1.5">
                              <h4 className="font-sans font-bold text-[#4A2711] text-[10.5px] uppercase tracking-wider">
                                1. Definition
                              </h4>
                              <p className="text-xs leading-relaxed font-bold bg-[#FAF6F0] p-3.5 rounded-xl border border-[#EADDC9]/50">
                                {study.study_notes_mode.definition}
                              </p>
                            </div>

                            {/* 2. In Simple Words */}
                            <div className="space-y-1.5 border-l-4 border-[#4A2711]/30 pl-4 py-1">
                              <h4 className="font-sans font-bold text-gray-800 text-[10.5px] uppercase tracking-wider">
                                2. In Simple Words (Analogy)
                              </h4>
                              <p className="text-xs leading-relaxed italic text-gray-700">
                                {study.study_notes_mode.in_simple_words}
                              </p>
                            </div>

                            {/* 3. Why It Matters */}
                            <div className="space-y-1.5">
                              <h4 className="font-sans font-bold text-gray-800 text-[10.5px] uppercase tracking-wider">
                                3. Why It Matters
                              </h4>
                              <p className="text-xs leading-relaxed text-gray-650">
                                {study.study_notes_mode.why_it_matters}
                              </p>
                            </div>

                            {/* 4. Core Concepts */}
                            <div className="space-y-2">
                              <h4 className="font-sans font-bold text-gray-800 text-[10.5px] uppercase tracking-wider">
                                4. Core Concepts
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {study.study_notes_mode.core_concepts.map((concept, idx) => (
                                  <div key={idx} className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1">
                                    <div className="font-sans font-bold text-gray-900 text-[10.5px]">{concept.term}</div>
                                    <div className="text-[10px] text-gray-500 leading-normal">{concept.explanation}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 5. Formula / Law */}
                            <div className="bg-[#FAF6F0]/30 border border-[#EADDC9]/50 p-4 rounded-xl space-y-2">
                              <h4 className="font-sans font-bold text-[#4A2711] text-[10.5px] uppercase tracking-wider">
                                5. Formula / Law
                              </h4>
                              <div className="text-xs font-mono text-center py-2 bg-white rounded-lg border border-gray-100">
                                {study.study_notes_mode.formula_law}
                              </div>
                              {study.study_notes_mode.derivation && (
                                <div className="space-y-1.5 pt-2">
                                  <div className="font-sans font-bold text-gray-800 text-[9.5px] uppercase">6. Derivation Details</div>
                                  <p className="text-xs font-mono text-gray-600 whitespace-pre-line leading-relaxed">{study.study_notes_mode.derivation}</p>
                                </div>
                              )}
                            </div>

                            {/* 6. Solved Sum */}
                            {study.study_notes_mode.solved_sum && (
                              <div className="space-y-3.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-sans font-bold text-gray-800 text-[10.5px] uppercase tracking-wider">
                                  7. Solved Numerical Sum
                                </h4>
                                <div className="space-y-2 text-xs leading-relaxed">
                                  <div><strong>Given:</strong> {study.study_notes_mode.solved_sum.given}</div>
                                  <div><strong>Formula:</strong> {study.study_notes_mode.solved_sum.formula}</div>
                                  <div><strong>Substitution:</strong> {study.study_notes_mode.solved_sum.substitution}</div>
                                  <div><strong>Calculation:</strong> {study.study_notes_mode.solved_sum.calculation}</div>
                                  <div className="pt-2 border-t border-gray-200/50 font-bold text-gray-900">
                                    Answer: {study.study_notes_mode.solved_sum.final_answer} {study.study_notes_mode.solved_sum.unit}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 7. Solved Practical Example */}
                            <div className="space-y-1.5">
                              <h4 className="font-sans font-bold text-gray-800 text-[10.5px] uppercase tracking-wider">
                                8. Real-world / Practical Example
                              </h4>
                              <p className="text-xs leading-relaxed text-gray-655">
                                {study.study_notes_mode.example}
                              </p>
                            </div>

                            {/* 8. Common Mistakes & Memory Tricks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-red-50/30 border border-red-200/40 p-4 rounded-xl space-y-1.5 font-sans">
                                <h4 className="font-bold text-red-900 text-[10.5px] uppercase tracking-wider">
                                  ⚠️ 9. Common Mistakes
                                </h4>
                                <ul className="list-disc list-inside text-[10.5px] text-gray-655 space-y-1 leading-normal font-serif">
                                  {study.study_notes_mode.common_mistakes.map((m, i) => <li key={i}>{m}</li>)}
                                </ul>
                              </div>

                              {study.study_notes_mode.memory_trick && (
                                <div className="bg-amber-50/40 border border-amber-250/30 p-4 rounded-xl space-y-1.5 font-sans">
                                  <h4 className="font-bold text-amber-900 text-[10.5px] uppercase tracking-wider">
                                    💡 10. Memory Mnemonic Trick
                                  </h4>
                                  <p className="text-xs text-gray-750 italic leading-relaxed font-serif">
                                    "{study.study_notes_mode.memory_trick}"
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* 9. Exam questions */}
                            <div className="space-y-3">
                              <h4 className="font-sans font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">
                                ✏️ 11. Exam Prep & Practice Questions
                              </h4>
                              <div className="grid grid-cols-1 gap-2.5 font-sans text-xs">
                                {study.study_notes_mode.exam_questions.map((eq, i) => (
                                  <div key={i} className="border border-gray-150 rounded-xl p-3 bg-white space-y-1 shadow-2xs">
                                    <div className="font-bold text-gray-850 flex items-center justify-between">
                                      <span>Question ({eq.marks}-Mark Style)</span>
                                      <span className="text-[9.5px] font-bold text-[#4A2711] bg-[#FAF6F0] px-1.5 py-0.5 rounded-full border border-[#EADDC9]/50">{eq.marks} Marks</span>
                                    </div>
                                    <p className="font-semibold text-gray-900 mt-1 leading-relaxed">{eq.question}</p>
                                    <div className="text-xs text-gray-650 leading-relaxed border-l-2 border-[#4A2711]/45 pl-3 mt-1.5 font-serif">
                                      <strong>Model Answer:</strong> {eq.answer}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 10. 30-Second Revision */}
                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center space-y-1 font-sans">
                              <h4 className="font-bold text-[#4A2711] text-[10.5px] uppercase tracking-wider">
                                ⌛ 12. 30-Second Final Revision
                              </h4>
                              <p className="text-xs font-serif text-gray-700 italic">
                                "{study.study_notes_mode.revision_30s}"
                              </p>
                            </div>

                          </div>
                        </div>
                      ) : study.math_mode ? (
                        <div className="pl-10 max-w-3xl">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-serif text-gray-800 space-y-5">
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-widest font-sans">🧮 Math Solver Framework</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic}</h2>
                            </div>
                            <div className="space-y-3.5 text-xs">
                              <div><strong>Given / Knowns:</strong>
                                <ul className="list-disc list-inside mt-1 font-sans text-gray-600">
                                  {study.math_mode.given.map((g, i) => <li key={i}>{g}</li>)}
                                </ul>
                              </div>
                              <div><strong>To Find:</strong> {study.math_mode.to_find}</div>
                              <div><strong>Formula Used:</strong> <code className="bg-gray-50 p-1 rounded border font-mono">{study.math_mode.formula}</code></div>
                              <div><strong>Substitution:</strong> {study.math_mode.substitution}</div>
                              <div className="p-3 bg-[#FAF6F0]/40 rounded-xl border border-gray-100 font-mono text-gray-750">
                                <strong>Calculations:</strong>
                                <div className="mt-1 whitespace-pre-line leading-relaxed">{study.math_mode.calculation}</div>
                              </div>
                              <div className="text-sm font-bold text-gray-900 border-t border-gray-150 pt-2.5">
                                Final Answer: {study.math_mode.answer}
                              </div>
                              <div className="text-[10px] text-gray-400 italic">
                                <strong>Sanity Check:</strong> {study.math_mode.check}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : study.coding_mode ? (
                        <div className="pl-10 max-w-4xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">💻 Coding / Debugging Mode</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic} ({study.coding_mode.language})</h2>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-455 uppercase">Program Objective</span>
                              <p className="text-xs text-gray-655 leading-relaxed font-serif">{study.coding_mode.purpose}</p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-455 uppercase">Source Code</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(study.coding_mode?.code || "");
                                    alert("Code copied to clipboard!");
                                  }}
                                  className="text-[10px] text-[#4A2711] font-bold hover:underline"
                                >
                                  📋 Copy Code
                                </button>
                              </div>
                              <pre className="bg-gray-950 text-gray-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                                {study.coding_mode.code}
                              </pre>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-gray-455 uppercase">Line-by-Line Code Explanation</span>
                              <div className="space-y-1.5 text-[11px]">
                                {study.coding_mode.explanation.map((e, idx) => (
                                  <div key={idx} className="p-2.5 bg-gray-50 border border-gray-150 rounded-xl leading-relaxed">
                                    <code className="font-bold text-[#4A2711] font-mono pr-2">{e.line_or_block}</code>
                                    <span className="text-gray-650 font-serif">: {e.purpose}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-800">Syntax breakdown</strong>
                                <p className="text-gray-600">{study.coding_mode.syntax}</p>
                              </div>
                              <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-800">Logic Flow</strong>
                                <p className="text-gray-600">{study.coding_mode.flow}</p>
                              </div>
                            </div>
                            {study.coding_mode.errors && (
                              <div className="bg-red-50/40 border border-red-200/50 p-4 rounded-xl space-y-1 text-xs">
                                <span className="font-bold text-red-800 text-[10.5px] uppercase">⚠️ Identified Bugs & Errors</span>
                                <p className="text-gray-655 leading-relaxed font-serif">{study.coding_mode.errors}</p>
                              </div>
                            )}
                            {study.coding_mode.improved_version && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-455 uppercase">Optimized / Clean Version</span>
                                <pre className="bg-gray-950 text-green-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                                  {study.coding_mode.improved_version}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : study.how_to_mode ? (
                        <div className="pl-10 max-w-3xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">📖 How-To Guide / Manual</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic}</h2>
                            </div>
                            <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-xl text-xs space-y-0.5">
                              <strong className="text-amber-900 uppercase text-[9px] tracking-wide">Step 0: Prerequisites</strong>
                              <p className="text-gray-700 font-serif leading-relaxed">{study.how_to_mode.step_0_prerequisites}</p>
                            </div>
                            <div className="space-y-3">
                              {study.how_to_mode.steps.map((s, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1 text-xs font-serif leading-relaxed">
                                  <div className="font-bold font-sans text-gray-900 text-[10.5px]">Step {s.step_num}: {s.title}</div>
                                  <div className="text-gray-700 mt-1"><strong>Action:</strong> <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{s.action}</code></div>
                                  <div className="text-gray-450 mt-0.5 font-medium"><strong>Why:</strong> {s.why}</div>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed pt-2 border-t border-gray-100">
                              <div className="space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-800">Troubleshoot advice</strong>
                                <p className="text-gray-550">{study.how_to_mode.step_5_troubleshoot}</p>
                              </div>
                              <div className="space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-800">Expected Final Outcome</strong>
                                <p className="text-gray-555">{study.how_to_mode.step_6_finish}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : study.comparison_mode ? (
                        <div className="pl-10 max-w-4xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">⚖️ Decision / Comparison Matrix</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic}</h2>
                            </div>
                            <div className="overflow-x-auto border border-gray-150 rounded-xl">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-455 uppercase">
                                    <th className="p-3">Criterion</th>
                                    <th className="p-3">Option A</th>
                                    <th className="p-3">Option B</th>
                                    <th className="p-3">Best For</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-750">
                                  {study.comparison_mode.comparison_table.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                      <td className="p-3 font-bold text-gray-900">{row.criterion}</td>
                                      <td className="p-3 font-medium">{row.option_a}</td>
                                      <td className="p-3 font-medium">{row.option_b}</td>
                                      <td className="p-3 font-bold text-[#4A2711]">{row.best_for}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="bg-[#FAF6F0] border-l-4 border-[#4A2711] p-4 rounded-r-xl space-y-1">
                              <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-wider">Final Verdict Decision</span>
                              <p className="text-xs leading-relaxed font-serif italic text-gray-800">"{study.comparison_mode.verdict}"</p>
                            </div>
                          </div>
                        </div>
                      ) : study.dsa_mode ? (
                        <div className="pl-10 max-w-4xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            
                            {/* Header */}
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">🧠 DSA Algorithm Analyzer</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic}</h2>
                            </div>

                            {/* 1. Intro & Prerequisites */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-1">
                                <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Introduction</h4>
                                <p className="text-xs text-gray-700 leading-relaxed font-serif">{study.dsa_mode.introduction}</p>
                              </div>
                              <div className="bg-[#FAF6F0]/50 border border-[#EADDC9]/50 p-4 rounded-xl space-y-1">
                                <h4 className="font-bold text-[#4A2711] text-[10.5px] uppercase tracking-wider">Prerequisite Knowledge</h4>
                                <p className="text-xs text-gray-700 leading-relaxed font-serif">{study.dsa_mode.prerequisite}</p>
                              </div>
                            </div>

                            {/* 2. Mechanics */}
                            <div className="space-y-1.5">
                              <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">How it Works & When to Use</h4>
                              <p className="text-xs text-gray-750 leading-relaxed font-serif">{study.dsa_mode.how_it_works}</p>
                              <div className="text-[10px] text-gray-400 mt-1">
                                <strong>When to Apply:</strong> {study.dsa_mode.when_to_use}
                              </div>
                            </div>

                            {/* 3. Visual Explanation (ASCII Art Box) */}
                            {study.dsa_mode.visual_explanation && (
                              <div className="space-y-1.5">
                                <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Visual Representation</h4>
                                <pre className="p-4 bg-gray-950 text-amber-405 border border-gray-150 rounded-xl font-mono text-[10.5px] overflow-x-auto whitespace-pre leading-relaxed">
                                  {study.dsa_mode.visual_explanation}
                                </pre>
                              </div>
                            )}

                            {/* 4. Algorithm / Code Implementation */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Source Code Implementation</h4>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(study.dsa_mode?.code || "");
                                    alert("DSA Code copied to clipboard!");
                                  }}
                                  className="text-[10px] text-[#4A2711] font-bold hover:underline"
                                >
                                  📋 Copy Code
                                </button>
                              </div>
                              <pre className="bg-gray-950 text-gray-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                                {study.dsa_mode.code}
                              </pre>
                            </div>

                            {/* 5. Dry Run Trace */}
                            <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl space-y-1">
                              <h4 className="font-bold text-blue-900 text-[10.5px] uppercase tracking-wider">Dry Run Walkthrough</h4>
                              <p className="text-xs text-gray-750 leading-relaxed font-serif whitespace-pre-wrap">{study.dsa_mode.dry_run}</p>
                            </div>

                            {/* 6. Complexity Matrix */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 text-center">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Time Complexity</span>
                                <div className="text-sm font-black text-[#4A2711] mt-0.5">{study.dsa_mode.time_complexity}</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 text-center">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Space Complexity</span>
                                <div className="text-sm font-black text-[#4A2711] mt-0.5">{study.dsa_mode.space_complexity}</div>
                              </div>
                            </div>

                            {/* 7. Common Mistakes */}
                            <div className="bg-red-50/40 border border-red-200/50 p-4 rounded-xl space-y-1.5">
                              <h4 className="font-bold text-red-900 text-[10.5px] uppercase tracking-wider">Common Implementation Mistakes</h4>
                              <ul className="list-disc list-inside text-xs text-gray-750 space-y-1 leading-normal font-serif">
                                {study.dsa_mode.common_mistakes.map((m, i) => <li key={i}>{m}</li>)}
                              </ul>
                            </div>

                            {/* 8. Interview Questions */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Top Interview Drill Questions</h4>
                              <div className="grid grid-cols-1 gap-2.5">
                                {study.dsa_mode.interview_questions.map((iq, i) => (
                                  <div key={i} className="border border-gray-150 rounded-xl p-3 bg-white space-y-1 shadow-2xs">
                                    <p className="font-bold text-gray-900 text-xs">Q: {iq.question}</p>
                                    <p className="text-xs text-gray-655 leading-relaxed border-l-2 border-[#4A2711]/45 pl-3 mt-1 font-serif">
                                      <strong>Optimal Response:</strong> {iq.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 9. Practice Checklist */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Curated Practice Problems Checklist</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {study.dsa_mode.practice_problems.map((prob, i) => (
                                  <div key={i} className="flex items-center justify-between border border-gray-150 p-3 rounded-xl bg-gray-50/30">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        prob.difficulty === "Easy" ? "bg-green-100 text-green-800" :
                                        prob.difficulty === "Medium" ? "bg-amber-105 text-amber-900" : "bg-red-100 text-red-800"
                                      }`}>{prob.difficulty}</span>
                                      <span className="text-xs font-semibold text-gray-800">{prob.title}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 italic">{prob.link_desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      ) : study.business_mode ? (
                        <div className="pl-10 max-w-4xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            
                            {/* Header */}
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">💼 Business Strategy Planner</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">{study.topic} Blueprint</h2>
                            </div>

                            {/* 1. Problem & Customer Persona */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-red-950">Market Pain Point</strong>
                                <p className="text-gray-700">{study.business_mode.problem}</p>
                              </div>
                              <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-blue-950">Target Customer Persona</strong>
                                <p className="text-gray-700">{study.business_mode.customer}</p>
                              </div>
                            </div>

                            {/* 2. Market TAM/SAM and Competitor Matrix */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">TAM / SAM / SOM TAM Analysis</strong>
                                <p className="text-gray-700">{study.business_mode.market}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Competitor Matrix Analysis</strong>
                                <p className="text-gray-700">{study.business_mode.competitors}</p>
                              </div>
                            </div>

                            {/* 3. Unique Differentiation */}
                            <div className="bg-[#FAF6F0] border-l-4 border-[#4A2711] p-4 rounded-r-xl space-y-1">
                              <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-wider">Unique Value Proposition (UVP)</span>
                              <p className="text-xs leading-relaxed font-serif italic text-gray-800">"{study.business_mode.differentiation}"</p>
                            </div>

                            {/* 4. Business and Monetization Model */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Business Model Outline</strong>
                                <p className="text-gray-700">{study.business_mode.business_model}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Pricing Strategy</strong>
                                <p className="text-gray-700">{study.business_mode.pricing}</p>
                              </div>
                            </div>

                            {/* 5. GTM & Distribution channels */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Marketing & Growth Channels</strong>
                                <p className="text-gray-700">{study.business_mode.marketing}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Distribution Strategy</strong>
                                <p className="text-gray-700">{study.business_mode.distribution}</p>
                              </div>
                            </div>

                            {/* 6. Costs & Revenue Streams */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Cost Structure Drivers</strong>
                                <p className="text-gray-700">{study.business_mode.costs}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Revenue Streams</strong>
                                <p className="text-gray-700">{study.business_mode.revenue_model}</p>
                              </div>
                            </div>

                            {/* 7. MVP & Validation Plan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-amber-50/20 border border-amber-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-amber-950">MVP Blueprint</strong>
                                <p className="text-gray-700">{study.business_mode.mvp}</p>
                              </div>
                              <div className="p-4 bg-[#FAF6F0]/50 border border-[#EADDC9]/50 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-[#4A2711]">Validation & Test Plan</strong>
                                <p className="text-gray-700">{study.business_mode.validation_plan}</p>
                              </div>
                            </div>

                            {/* 8. Risks Card */}
                            <div className="bg-red-50/40 border border-red-200/50 p-4 rounded-xl space-y-1 text-xs">
                              <span className="font-bold text-red-800 text-[10.5px] uppercase">⚠️ Top Business Threats & Risks</span>
                              <p className="text-gray-655 leading-relaxed font-serif">{study.business_mode.risks}</p>
                            </div>

                          </div>
                        </div>
                      ) : study.career_mode ? (
                        <div className="pl-10 max-w-4xl space-y-5">
                          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md p-6 font-sans text-gray-800 space-y-5">
                            
                            {/* Header */}
                            <div className="border-b border-gray-150 pb-3">
                              <span className="text-[9.5px] font-extrabold text-[#4A2711] uppercase tracking-widest">🎯 Professional Career Roadmap</span>
                              <h2 className="text-base font-bold text-gray-900 mt-1">Goal: {study.topic}</h2>
                            </div>

                            {/* 1. Skill Gap Assessment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Current Assessment Baseline</strong>
                                <p className="text-gray-700">{study.career_mode.current_level}</p>
                              </div>
                              <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-red-950">Identified Skill Gaps</strong>
                                <p className="text-gray-700">{study.career_mode.skill_gap}</p>
                              </div>
                            </div>

                            {/* 2. Target Profile Goals */}
                            <div className="bg-[#FAF6F0] border-l-4 border-[#4A2711] p-4 rounded-r-xl space-y-1">
                              <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-wider">Target Objective Focus</span>
                              <p className="text-xs leading-relaxed font-serif italic text-gray-800">"{study.career_mode.target}"</p>
                            </div>

                            {/* 3. Milestone Roadmap & Schedules */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Milestone Roadmap Timeline</strong>
                                <p className="text-gray-700">{study.career_mode.roadmap}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Daily Preparation Schedule</strong>
                                <p className="text-gray-700">{study.career_mode.daily_schedule}</p>
                              </div>
                            </div>

                            {/* 4. Preparation Focus Tracks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">DSA Practice Syllabus</strong>
                                <p className="text-gray-700">{study.career_mode.dsa_plan}</p>
                              </div>
                              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-gray-850">Project Building Track</strong>
                                <p className="text-gray-700">{study.career_mode.projects}</p>
                              </div>
                            </div>

                            {/* 5. Profile Building Guidelines */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-serif leading-relaxed">
                              <div className="p-3 bg-gray-55 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[9px] uppercase text-gray-800">Resume Optimization</strong>
                                <p className="text-gray-600 text-[11px] leading-relaxed">{study.career_mode.resume}</p>
                              </div>
                              <div className="p-3 bg-gray-55 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[9px] uppercase text-gray-800">GitHub Profile</strong>
                                <p className="text-gray-600 text-[11px] leading-relaxed">{study.career_mode.github}</p>
                              </div>
                              <div className="p-3 bg-gray-55 border border-gray-150 rounded-xl space-y-1">
                                <strong className="font-sans text-[9px] uppercase text-gray-800">LinkedIn Networking</strong>
                                <p className="text-gray-600 text-[11px] leading-relaxed">{study.career_mode.linkedin}</p>
                              </div>
                            </div>

                            {/* 6. Interview & Mock Prep */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                              <div className="p-4 bg-green-50/20 border border-green-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-green-955">Interview Preparation Milestones</strong>
                                <p className="text-gray-700">{study.career_mode.interview_preparation}</p>
                              </div>
                              <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-1">
                                <strong className="font-sans text-[10px] uppercase text-blue-955">Mock Interview Checklist</strong>
                                <p className="text-gray-700">{study.career_mode.mock_interviews}</p>
                              </div>
                            </div>

                            {/* 7. Progress Metrics */}
                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center space-y-1 font-sans">
                              <h4 className="font-bold text-[#4A2711] text-[10.5px] uppercase tracking-wider">
                                ⌛ Progress & Review Checklist
                              </h4>
                              <p className="text-xs font-serif text-gray-750">{study.career_mode.progress_tracking}</p>
                            </div>

                          </div>
                        </div>
                      ) : (
                        <div className="pl-10">
                          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
                          
                          {/* 1. Quick Answer */}
                          {study.quick_answer && (
                            <div>
                              <div
                                onClick={() => toggleCard("quick_answer")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-orange-500 text-sm">⚡</span>
                                  Quick Answer
                                </div>
                                {expandedCards["quick_answer"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["quick_answer"] && (
                                <div className="p-4 pt-0 text-xs text-gray-650 leading-relaxed">
                                  <div dangerouslySetInnerHTML={{ __html: renderMathText(study.quick_answer) }}></div>
                                  <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100/50 pt-2 select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(study.quick_answer);
                                        alert("Copied to clipboard!");
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📋</span> Copy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. Easy Explanation */}
                          {study.easy_explanation && (
                            <div>
                              <div
                                onClick={() => toggleCard("easy_explanation")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-green-500 text-sm">🟢</span>
                                  Easy Explanation
                                </div>
                                {expandedCards["easy_explanation"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["easy_explanation"] && (
                                <div className="p-4 pt-0 text-xs text-gray-650 leading-relaxed border-l-2 border-l-green-500/50 pl-3.5 ml-4 mb-4">
                                  <div dangerouslySetInnerHTML={{ __html: renderMathText(study.easy_explanation) }}></div>
                                  <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100/50 pt-2 select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(study.easy_explanation);
                                        alert("Copied to clipboard!");
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📋</span> Copy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Normal Solution */}
                          {study.normal_solution && (
                            <div>
                              <div
                                onClick={() => toggleCard("normal_solution")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-blue-500 text-sm">🔵</span>
                                  Normal Solution
                                </div>
                                {expandedCards["normal_solution"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["normal_solution"] && (
                                <div className="p-4 pt-0 text-xs text-gray-650 leading-relaxed whitespace-pre-wrap">
                                  <div dangerouslySetInnerHTML={{ __html: renderMathText(study.normal_solution) }}></div>
                                  <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100/50 pt-2 select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(study.normal_solution);
                                        alert("Copied to clipboard!");
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📋</span> Copy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Formulas */}
                          {study.formulas && study.formulas.length > 0 && (
                            <div>
                              <div
                                onClick={() => toggleCard("formula")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-sm">📌</span>
                                  Important Formula
                                </div>
                                {expandedCards["formula"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["formula"] && (
                                <div className="p-4 pt-0 space-y-3">
                                  {study.formulas.map((f: GeminiFormulaItem, fIdx: number) => (
                                    <div key={fIdx} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                      <div className="font-serif font-bold text-gray-900 mb-1.5 text-center text-sm" dangerouslySetInnerHTML={{ __html: renderMathText(f.formula) }}></div>
                                      <div className="text-[10px] text-gray-500 leading-relaxed">
                                        <strong>Where;</strong> {f.meaning}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 5. Example */}
                          {study.examples && study.examples.length > 0 && (
                            <div>
                              <div
                                onClick={() => toggleCard("example")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-green-600 text-sm">🟢</span>
                                  Example
                                </div>
                                {expandedCards["example"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["example"] && (
                                <div className="p-4 pt-0 space-y-2">
                                  {study.examples.map((item: GeminiExampleItem, exIdx: number) => (
                                    <div key={exIdx} className="text-xs text-gray-650 leading-relaxed">
                                      {item.scenario && <div className="font-semibold text-gray-800 mb-0.5">{item.scenario}</div>}
                                      <div>{item.explanation}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 6. Exam Answer */}
                          {study.exam_answer && (study.exam_answer.mark_2 || study.exam_answer.mark_5 || study.exam_answer.mark_10) && (
                            <div>
                              <div
                                onClick={() => toggleCard("exam")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-sm">📝</span>
                                  Exam Answer (5 Marks)
                                </div>
                                {expandedCards["exam"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["exam"] && (
                                <div className="p-4 pt-0 text-xs text-gray-650 leading-relaxed">
                                  <div>{study.exam_answer.mark_5 || study.exam_answer.mark_2 || study.exam_answer.mark_10}</div>
                                  <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100/50 pt-2 select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(study.exam_answer.mark_5 || study.exam_answer.mark_2 || study.exam_answer.mark_10 || "");
                                        alert("Copied to clipboard!");
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📋</span> Copy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 7. Memory Trick */}
                          {study.memory_trick && (
                            <div>
                              <div
                                onClick={() => toggleCard("memory")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-sm">🧠</span>
                                  Memory Trick
                                </div>
                                {expandedCards["memory"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["memory"] && (
                                <div className="p-4 pt-0 text-xs text-gray-650 leading-relaxed font-medium bg-[#FAF6F0]/40 py-2 border-l-2 border-l-amber-500/50 pl-3">
                                  <div>{study.memory_trick}</div>
                                  <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100/50 pt-2 select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(study.memory_trick);
                                        alert("Copied to clipboard!");
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-[#4A2711] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📋</span> Copy
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadSingleReplyAsPDF(study);
                                      }}
                                      className="text-[10px] text-[#4A2711] hover:text-[#5c3216] font-bold flex items-center gap-1 transition"
                                    >
                                      <span>📥</span> Download PDF
                                    </button>
                                    {(() => {
                                      const activeConv = conversations.find(c => c.id === activeConvId);
                                      const isConvSaved = activeConv?.is_saved || false;
                                      return (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!activeConvId) return;
                                            const nextSavedState = !isConvSaved;
                                            await dbService.toggleSaveConversation(activeConvId, nextSavedState);
                                            setConversations(prev =>
                                              prev.map(c => c.id === activeConvId ? { ...c, is_saved: nextSavedState } : c)
                                            );
                                            alert(nextSavedState ? "Chat saved to bookmarks!" : "Chat removed from bookmarks!");
                                          }}
                                          className={`text-[10px] font-bold flex items-center gap-1 transition ${
                                            isConvSaved ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-[#4A2711]"
                                          }`}
                                        >
                                          <span>🔖</span> {isConvSaved ? "Saved" : "Save"}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 8. Quiz */}
                          {study.quiz && study.quiz.length > 0 && (
                            <div>
                              <div
                                onClick={() => toggleCard("quiz")}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                  <span className="text-red-500 text-sm">❓</span>
                                  Quiz
                                </div>
                                {expandedCards["quiz"] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                              {expandedCards["quiz"] && (
                                <div className="p-4 pt-0 space-y-4">
                                  {study.quiz.map((q: GeminiQuizQuestion, qIdx: number) => {
                                    const quizKey = `${msg.id || index}-${qIdx}`;
                                    const selectedOption = selectedQuizAnswers[quizKey];
                                    const isSubmitted = submittedQuizzes[quizKey];
                                    const isCorrect = selectedOption?.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();

                                    return (
                                      <div key={qIdx} className="bg-gray-50 p-3.5 rounded-xl space-y-2 border border-gray-100">
                                        <div className="font-semibold text-xs text-gray-800">{q.question}</div>
                                        <div className="grid grid-cols-1 gap-2">
                                          {q.options.map((opt: string, oIndex: number) => (
                                            <button
                                              key={oIndex}
                                              disabled={isSubmitted}
                                              onClick={() => handleQuizAnswer(quizKey as any, opt, q.correct_answer)}
                                              className={`p-2 rounded-lg border text-left text-xs transition ${
                                                isSubmitted
                                                  ? opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
                                                    ? "bg-green-50 border-green-400 text-green-700 font-medium"
                                                    : selectedOption === opt
                                                    ? "bg-red-50 border-red-400 text-red-700 font-medium"
                                                    : "opacity-50"
                                                  : selectedOption === opt
                                                  ? "bg-[#4A2711]/15 border-[#4A2711] text-[#4A2711] font-semibold"
                                                  : "bg-white hover:bg-gray-100 border-gray-250/50"
                                              }`}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                        {!isSubmitted ? (
                                          <button
                                            onClick={() => submitQuizAnswer(quizKey as any, selectedOption, q.correct_answer)}
                                            disabled={!selectedOption}
                                            className="px-3.5 py-1.5 bg-[#4A2711] hover:bg-[#5c3216] text-white rounded-lg text-xs font-bold transition shadow-sm mt-1"
                                          >
                                            Submit
                                          </button>
                                        ) : (
                                          <div className="text-[10px] text-gray-500 italic mt-1 leading-relaxed bg-white p-2 rounded-md border border-gray-100">
                                            {isCorrect ? "✓ Correct!" : `✗ Incorrect (Correct: ${q.correct_answer})`} &bull; {q.explanation}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Centered select/button for Show All */}
                        <div className="mt-3.5 flex justify-start">
                          <button
                            onClick={() => {
                              const allExpanded = Object.values(expandedCards).every(v => v === true);
                              const nextState = !allExpanded;
                              setExpandedCards({
                                quick_answer: nextState,
                                easy_explanation: nextState,
                                normal_solution: nextState,
                                formula: nextState,
                                example: nextState,
                                exam: nextState,
                                memory: nextState,
                                quiz: nextState
                              });
                            }}
                            className="text-[11px] text-[#4A2511]/90 font-bold hover:underline flex items-center gap-1 bg-[#FAF6F0] p-1.5 px-3 rounded-lg border border-[#EADDC9]/60 shadow-sm"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${Object.values(expandedCards).every(v => v === true) ? 'rotate-180' : ''}`} />
                            Show All
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white border border-gray-200/50 animate-pulse flex flex-col gap-3 items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-[#4A2711]/30 border-t-[#4A2711] animate-spin"></div>
                <p className="text-xs text-gray-555 font-semibold mb-1">Generating QuickSolv solution...</p>
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-4 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl transition cursor-pointer hover:shadow-sm"
                >
                  Stop Generation
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM INPUT BAR (Contained inside central column between yellow lines!) */}
          {(currentTab !== "Quiz" && currentTab !== "Notes" && currentTab !== "Profile" && currentTab !== "Settings" && currentTab !== "History" && currentTab !== "Study Plan" && messages.length > 0) && (
            <div className="p-2.5 px-4 border-t border-gray-200/50 bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="max-w-xl mx-auto space-y-1.5">
                
                {/* Settings row (Model & Mode select) */}
                <div className="flex items-center gap-1.5 select-none pb-0.5">
                  
                  {/* Model dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-lg text-[11px] font-semibold text-gray-750 hover:text-gray-950 transition select-none shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-[#4A2711]" />
                      <span>
                        {activeModel === "ox-alpha" ? "Main Ox Alpha" :
                         activeModel === "gemini-3.6-flash" ? "Gemini 3.6 Flash" :
                         activeModel === "gemini-3.5-flash" ? "Gemini 3.5 Flash" :
                         activeModel === "gemini-3.1-pro" ? "Gemini 3.1 Pro" :
                         activeModel === "claude-sonnet-4.6" ? "Claude Sonnet 4.6" :
                         activeModel === "claude-opus-4.6" ? "Claude Opus 4.6" :
                         activeModel === "gpt-oss-120b" ? "GPT-OSS 120B" :
                         activeModel === "nvidia-nemotron-3-ultra-free" ? "Nemotron 3 Ultra" :
                         activeModel === "gemma-4-31b-free" ? "Gemma 4 31B" :
                         activeModel === "free-models-router" ? "Free Models Router" :
                         activeModel === "gpt-oss-20b-free" ? "gpt-oss-20b" : "Main Ox Alpha"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {showModelDropdown && (
                      <div className="absolute left-0 bottom-full mb-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-55 text-[11px] text-gray-700 font-medium">
                        <div className="px-3 py-1 text-[9.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">
                          Select AI Model
                        </div>
                        {[
                          { id: "ox-alpha", label: "Main Ox Alpha", meta: "Alpha AI", icon: true },
                          { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", meta: "Fast", icon: true },
                          { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", meta: "Fast", icon: true },
                          { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", meta: "", icon: false },
                          { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", meta: "", icon: false },
                          { id: "claude-opus-4.6", label: "Claude Opus 4.6", meta: "", icon: false },
                          { id: "gpt-oss-120b", label: "GPT-OSS 120B", meta: "", icon: false },
                          { id: "nvidia-nemotron-3-ultra-free", label: "Nemotron 3 Ultra", meta: "Free", icon: false },
                          { id: "gemma-4-31b-free", label: "Gemma 4 31B", meta: "Free", icon: false },
                          { id: "free-models-router", label: "Free Router", meta: "Free", icon: false },
                          { id: "gpt-oss-20b-free", label: "gpt-oss-20b", meta: "Free", icon: false }
                        ].map(m => {
                          const isSelected = activeModel === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setActiveModel(m.id);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition cursor-pointer ${
                                isSelected ? "bg-[#FAF6F0] text-[#4A2711] font-bold" : "hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                 <span className="truncate">{m.label}</span>
                                 {m.meta && (
                                   <span className="text-[8px] bg-gray-100 text-gray-500 px-1 rounded font-bold shrink-0">
                                     {m.meta}
                                   </span>
                                 )}
                              </div>
                              {isSelected && <Check className="w-3 h-3 text-[#4A2711]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* AI Mode selector */}
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="bg-white hover:bg-gray-50 border border-gray-200/80 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-gray-750 hover:text-gray-950 outline-none cursor-pointer transition shadow-2xs"
                  >
                    <option value="chat">💬 Conversational Chat</option>
                    <option value="all-in-one">🚀 All-in-One Mode</option>
                    <option value="easy">🧠 Easy Explanation</option>
                    <option value="normal">🧮 Normal Solution</option>
                    <option value="research">📖 Research Mode</option>
                  </select>

                </div>
                
                {attachedImage && (
                  <div className="p-2 rounded-xl bg-[#FAF6F0] border border-[#EADDC9]/50 inline-flex items-center gap-3 shadow-sm relative mb-2">
                    {attachedImageMime === "application/pdf" ? (
                      <div className="w-14 h-14 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-750 text-xs font-black font-sans shrink-0">
                        PDF
                      </div>
                    ) : (
                      <img
                        src={`data:${attachedImageMime || "image/png"};base64,${attachedImage}`}
                        alt="Attached screenshot preview"
                        className="w-14 h-14 rounded-lg object-cover border border-[#EADDC9]"
                      />
                    )}
                    <span className="text-[10px] font-bold text-gray-500 pr-6">
                      {attachedImageMime === "application/pdf" ? "PDF Document Attachment" : "Pasted Image Attachment"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedImageMime(null);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold hover:bg-red-650 transition shadow"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="relative flex items-center bg-white border border-gray-200/80 rounded-xl px-3 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-[#4A2711]/20 focus-within:border-[#4A2711]/50 transition duration-200 min-h-[36px]">
                  
                  {/* Text Input area */}
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    onPaste={handlePaste}
                    rows={1}
                    placeholder="Ask anything or upload..."
                    className="flex-1 bg-transparent border-0 focus:ring-0 text-xs focus:outline-none resize-none text-gray-800 placeholder-gray-400 py-0.5 leading-normal"
                  />

                  {/* Attachments & Send */}
                  <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition cursor-pointer"
                      title="Upload Image/PDF"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={startCamera}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition cursor-pointer"
                      title="Camera capture"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading || (!prompt && !attachedImage)}
                      className="w-7 h-7 bg-[#4A2711] hover:bg-[#5c3216] disabled:opacity-40 text-white rounded-md flex items-center justify-center transition shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 transform rotate-45 -translate-x-0.5 translate-y-0.5 fill-white text-[#4A2711]" />
                    </button>
                  </div>

                </div>
              </form>
            </div>
          )}

        </div>

        {/* RIGHT FLOATING SUGGESTION PANEL (Try asking card - matches screenshot) */}
        <div className="w-72 border-l border-gray-200/50 bg-[#FCF9F5] p-5 hidden xl:flex flex-col space-y-5 overflow-y-auto shrink-0 z-0 h-full">
          
          {/* Try Asking suggestions */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              Try asking
            </div>
            <div className="space-y-1.5 flex flex-col">
              {[
                "Give me an example",
                "Make it easier to understand",
                "Give 5 mark answer",
                "Test me with a quiz",
                "Explain the formula"
              ].map((sStr, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => {
                    setPrompt(sStr);
                    handleSendMessage(null as any, sStr);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-[11px] text-gray-700 font-medium transition hover:shadow-sm"
                >
                  {sStr}
                </button>
              ))}
            </div>
          </div>

          {/* All-in-One Mode Panel */}
          <div className="bg-[#FAF6F0] border border-[#EADDC9]/50 rounded-2xl p-4 space-y-3.5 shadow-sm text-xs">
            <div className="font-bold text-[#4A2711] flex items-center gap-1 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-[#4A2711]" />
              All-in-One Mode
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Get complete learning package in one go - Answer, Explanation, Formula, Examples, Quiz & more.
            </p>
            <button
              onClick={() => {
                setAiMode("all-in-one");
              }}
              className="w-full py-2 border border-[#4A2711]/60 hover:bg-[#4A2711]/5 text-[#4A2711] text-[11px] font-bold rounded-lg transition"
            >
              Use All-in-One
            </button>
          </div>

          {/* Daily Streak Offer Button Card */}
          <button
            onClick={() => {
              setStreakModalView("rewards");
              setShowStreakModal(true);
            }}
            className="w-full text-left bg-gradient-to-r from-[#FAF6F0] to-[#FAF1E6] hover:to-[#FAF1E6]/80 border border-[#EADDC9] rounded-2xl p-3.5 shadow-sm relative overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] flex items-center justify-between group animate-fade-in select-none"
          >
            {/* Highlight badge on the top right */}
            <div className="absolute top-0 right-0 bg-[#4A2711] text-white font-extrabold text-[7px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg shadow-sm font-sans">
              Win Gifts
            </div>

            {/* Icon & Title info */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white border border-[#EADDC9] group-hover:border-amber-400 flex items-center justify-center shadow-sm shrink-0 transition">
                <span className="text-lg animate-pulse">🔥</span>
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-gray-900 font-serif">Daily Streak Offer</div>
                <div className="text-[9px] text-[#4A2711] font-bold font-sans">
                  Streak: {streakCount} {streakCount === 1 ? "Day" : "Days"}
                </div>
              </div>
            </div>

            {/* Animated Trigger */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-gradient-to-r from-red-500 to-amber-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full border border-amber-300 shadow-md animate-bounce font-sans">
                🎁 Offer!
              </span>
              <span className="text-amber-600 font-bold text-xs animate-pulse">➔</span>
            </div>
          </button>
        </div>

        </>
        )}
      </div>

      {/* Floating Webcam view */}
      {showCamera && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="relative w-full max-w-lg aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
          </div>
          <div className="flex gap-4">
            <button onClick={capturePhoto} className="px-6 py-2.5 bg-[#4A2711] text-white text-xs font-bold rounded-lg">Capture</button>
            <button onClick={cancelCamera} className="px-6 py-2.5 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg">Cancel</button>
          </div>
        </div>
      )}

        {/* Quiz Creation Modal */}
        {showCreateQuizModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 font-serif">Create Custom Quiz</h3>
                <button
                  onClick={() => setShowCreateQuizModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleGenerateQuiz} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Quiz Topic</label>
                  <input
                    type="text"
                    required
                    value={newQuizTopic}
                    onChange={(e) => setNewQuizTopic(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Python Lists, Calculus"
                    className="w-full p-2.5 rounded-xl border border-gray-250 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Difficulty</label>
                    <select
                      value={newQuizDifficulty}
                      onChange={(e) => setNewQuizDifficulty(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Questions</label>
                    <select
                      value={newQuizNumQuestions}
                      onChange={(e) => setNewQuizNumQuestions(parseInt(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-250 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="5">5 Questions</option>
                      <option value="10">10 Questions</option>
                      <option value="15">15 Questions</option>
                    </select>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-[10px] text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">{errorMessage}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateQuizModal(false)}
                    className="flex-1 py-2.5 bg-gray-50 border border-gray-250 hover:bg-gray-100 text-xs font-bold rounded-xl transition text-gray-705 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingQuiz || !newQuizTopic}
                    className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-white text-[#4A2711]" />
                        Generate Quiz
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Note Creator Modal */}
        {showCreateNoteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-905 font-serif">Create New Note</h3>
                <button
                  onClick={() => setShowCreateNoteModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Note Title</label>
                  <input
                    type="text"
                    required
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="e.g. Photosynthesis Light Reaction, OOP Encapsulation"
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Folder / Subject</label>
                  <select
                    value={newNoteSubject}
                    onChange={(e) => setNewNoteSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none bg-white cursor-pointer"
                  >
                    {foldersList.map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                    <option value="Biology">Biology</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Notes Content</label>
                  <textarea
                    required
                    rows={8}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type or paste your notes here..."
                    className="w-full p-2.5 rounded-xl border border-gray-205 text-xs focus:ring-1 focus:ring-[#4A2711] focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateNoteModal(false)}
                    className="flex-1 py-2.5 bg-gray-50 border border-gray-250 hover:bg-gray-100 text-xs font-bold rounded-xl transition text-gray-705 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Note Reader & AI Companion Modal */}
        {selectedNoteForView && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden text-xs">
              
              {/* Modal Top Header */}
              <div className="p-4 border-b border-gray-150 flex items-center justify-between shrink-0 bg-[#FCF9F5]">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-905 truncate max-w-xs sm:max-w-md">{selectedNoteForView.title}</h3>
                    <p className="text-[9px] text-gray-400 font-semibold mt-0.5">
                      Subject: {selectedNoteForView.subject} &bull; Created: {selectedNoteForView.createdOn}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadNoteAsPDF(selectedNoteForView)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A2711]/5 hover:bg-[#4A2711]/10 border border-[#4A2711]/20 text-[#4A2711] text-[10px] font-bold rounded-lg transition shadow-sm"
                  >
                    <span>📥 Download PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNoteForView(null);
                      setNoteAIResult(null);
                      setNoteAIActionType(null);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Modal Inner Workspace */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                
                {/* Left Pane: Notes content (live-editable!) */}
                <div className="flex-1 p-6 flex flex-col space-y-3 overflow-y-auto min-w-0">
                  <div className="flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-bold text-gray-450 uppercase tracking-widest">Note Editor (Auto-saved)</span>
                    <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Saved locally
                    </span>
                  </div>
                  
                  <textarea
                    value={selectedNoteForView.content}
                    onChange={(e) => {
                      const updatedContent = e.target.value;
                      setSelectedNoteForView((prev: any) => ({ ...prev, content: updatedContent }));
                      setNotesHistory(prev =>
                        prev.map(n => n.id === selectedNoteForView.id ? { ...n, content: updatedContent } : n)
                      );
                    }}
                    placeholder="Enter notes details here..."
                    className="flex-1 w-full p-4 rounded-2xl border border-gray-150 text-xs focus:ring-0 focus:outline-none resize-none bg-gray-50/40 text-gray-850 leading-relaxed font-sans"
                  />
                </div>

                {/* Right Pane: AI Companion Sidebar */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-150 p-5 flex flex-col bg-[#FCF9F5]/40 overflow-hidden shrink-0">
                  <div className="space-y-4 flex flex-col h-full">
                    
                    {/* Header */}
                    <div className="shrink-0">
                      <h4 className="text-[11px] font-bold text-[#4A2711] font-serif flex items-center gap-1.5">
                        <span>✨</span> QuickSolv AI Tutor
                      </h4>
                      <p className="text-[9px] text-gray-400 mt-1 leading-normal">
                        Select a tool to leverage our tutor on this note's content.
                      </p>
                    </div>

                    {/* Quick Tools list */}
                    <div className="grid grid-cols-3 md:grid-cols-1 gap-2 shrink-0">
                      <button
                        onClick={() => handleNoteAIAction("summarize", selectedNoteForView)}
                        disabled={isProcessingNoteAI}
                        className="py-2.5 bg-white border border-gray-200 hover:bg-[#FAF6F0] text-[10px] font-bold rounded-xl transition shadow-sm text-gray-700 flex items-center justify-center gap-1.5"
                      >
                        🤖 Summarize
                      </button>
                      
                      <button
                        onClick={() => handleNoteAIAction("explain", selectedNoteForView)}
                        disabled={isProcessingNoteAI}
                        className="py-2.5 bg-white border border-gray-200 hover:bg-[#FAF6F0] text-[10px] font-bold rounded-xl transition shadow-sm text-gray-700 flex items-center justify-center gap-1.5"
                      >
                        💡 Explain Core
                      </button>

                      <button
                        onClick={() => handleNoteConvertToQuiz(selectedNoteForView)}
                        disabled={isProcessingNoteAI}
                        className="py-2.5 bg-[#4A2711] hover:bg-[#5c3216] disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        ❓ Convert to Quiz
                      </button>
                    </div>

                    {/* AI Output Window */}
                    <div className="flex-1 bg-white border border-gray-200/80 rounded-2xl p-3.5 flex flex-col overflow-hidden min-h-0 shadow-inner">
                      
                      {isProcessingNoteAI ? (
                        /* LOADING STATE */
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-4">
                          <div className="w-6 h-6 rounded-full border border-[#4A2711]/30 border-t-[#4A2711] animate-spin"></div>
                          <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider animate-pulse">
                            Tutor is analyzing...
                          </p>
                        </div>
                      ) : noteAIResult ? (
                        /* RESULT RENDER */
                        <div className="flex-1 flex flex-col h-full min-h-0 justify-between">
                          <div className="flex-1 overflow-y-auto text-[10px] text-gray-750 leading-relaxed font-sans space-y-2 pr-1.5">
                            <h5 className="font-bold text-[#4A2711] uppercase tracking-wider text-[9px] mb-1">
                              AI {noteAIActionType === "summarize" ? "Summary" : "Explanation"}:
                            </h5>
                            <div className="whitespace-pre-wrap select-text">{noteAIResult}</div>
                          </div>
                          
                          {/* Insert button action */}
                          <button
                            onClick={() => {
                              const summaryBlock = `\n\n=== AI ${noteAIActionType === "summarize" ? "Summary" : "Explanation"} ===\n${noteAIResult}`;
                              const updatedContent = selectedNoteForView.content + summaryBlock;
                              
                              setSelectedNoteForView((prev: any) => ({ ...prev, content: updatedContent }));
                              setNotesHistory(prev =>
                                prev.map(n => n.id === selectedNoteForView.id ? { ...n, content: updatedContent } : n)
                              );
                              setNoteAIResult(null);
                            }}
                            className="w-full mt-3 py-1.5 border border-[#4A2711]/50 hover:bg-[#4A2711]/5 text-[10px] text-[#4A2711] font-bold rounded-lg transition shrink-0 bg-white"
                          >
                            📎 Append to Note
                          </button>
                        </div>
                      ) : (
                        /* IDLE STATE */
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-4 space-y-1">
                          <span className="text-xl">✨</span>
                          <p className="text-[10px] font-semibold">Tutor Companion is Idle</p>
                          <p className="text-[9px] text-gray-455">Click a tool button above to get answers from AI.</p>
                        </div>
                      )}

                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Edit Profile Details Modal */}
        {showEditAllModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-905 font-serif">Edit Profile Information</h3>
                <button
                  onClick={() => setShowEditAllModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  handleSaveProfile({
                    fullName: target.fullName.value,
                    emailAddress: target.emailAddress.value,
                    phoneNumber: target.phoneNumber.value,
                    dob: target.dob.value,
                    gender: target.gender.value,
                    location: target.location.value,
                    aboutMe: target.aboutMe.value
                  });
                  setShowEditAllModal(false);
                }}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    defaultValue={profileData.fullName}
                    placeholder="Ananya Kumar"
                    className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    name="emailAddress"
                    defaultValue={profileData.emailAddress}
                    placeholder="ananya.kumar25@gmail.com"
                    className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      name="phoneNumber"
                      defaultValue={profileData.phoneNumber}
                      placeholder="+91 98765 43210"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="text"
                      name="dob"
                      defaultValue={profileData.dob}
                      placeholder="12 March 2003"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Gender</label>
                    <input
                      type="text"
                      name="gender"
                      defaultValue={profileData.gender}
                      placeholder="Female"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Location</label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={profileData.location}
                      placeholder="Bengaluru, Karnataka, India"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">About Me</label>
                  <textarea
                    name="aboutMe"
                    defaultValue={profileData.aboutMe}
                    placeholder="Tell us about yourself..."
                    rows={2}
                    className="w-full p-2 rounded-xl border border-gray-205 focus:ring-1 focus:ring-[#4A2711] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditAllModal(false)}
                    className="flex-1 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold rounded-xl transition text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Streak Modal Overlay */}
        {showStreakModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-white via-white to-amber-50/25 border border-amber-200/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in text-xs font-sans">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <h3 className="text-sm font-bold text-gray-900 font-serif">QuickSolv Streak Challenge</h3>
                </div>
                <button
                  onClick={() => setShowStreakModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-450 hover:text-gray-650 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* View 1: rewards */}
              {streakModalView === "rewards" && (
                <div className="space-y-4">
                  <div className="bg-amber-500/5 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Your Stats</div>
                      <div className="text-xl font-black text-gray-900 mt-1">{streakCount} Days Active</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Solve 1 quiz daily to extend your streak.</div>
                    </div>
                    <span className="text-3xl animate-bounce">🔥</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-850">Unlocking Milestones</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2.5 rounded-2xl border ${streakCount >= 50 ? "bg-green-50/60 border-green-200 text-green-800 font-bold" : "bg-gray-50 border-gray-150 text-gray-450"}`}>
                        <span className="text-xl">🥤</span>
                        <div className="font-bold text-[10px] mt-1">Water Bottle</div>
                        <div className="text-[8.5px] text-gray-400 mt-0.5">50 Days</div>
                        {streakCount >= 50 && (
                          <button onClick={() => alert("Water Bottle claimed successfully!")} className="mt-1.5 w-full py-0.5 bg-[#4A2711] text-white text-[8px] font-bold rounded-lg">Claim</button>
                        )}
                      </div>
                      <div className={`p-2.5 rounded-2xl border ${streakCount >= 100 ? "bg-green-50/60 border-green-200 text-green-800 font-bold" : "bg-gray-50 border-gray-150 text-gray-450"}`}>
                        <span className="text-xl">🎒</span>
                        <div className="font-bold text-[10px] mt-1">Backpack</div>
                        <div className="text-[8.5px] text-gray-400 mt-0.5">100 Days</div>
                        {streakCount >= 100 && (
                          <button onClick={() => alert("Backpack claimed successfully!")} className="mt-1.5 w-full py-0.5 bg-[#4A2711] text-white text-[8px] font-bold rounded-lg">Claim</button>
                        )}
                      </div>
                      <div className={`p-2.5 rounded-2xl border ${streakCount >= 200 ? "bg-green-50/60 border-green-200 text-green-800 font-bold" : "bg-gray-50 border-gray-150 text-gray-450"}`}>
                        <span className="text-xl">🎁</span>
                        <div className="font-bold text-[10px] mt-1">Full Combo Kit</div>
                        <div className="text-[8.5px] text-gray-400 mt-0.5">200 Days</div>
                        {streakCount >= 200 && (
                          <button onClick={() => alert("Full Kit claimed successfully!")} className="mt-1.5 w-full py-0.5 bg-[#4A2711] text-white text-[8px] font-bold rounded-lg">Claim</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 font-bold text-xs pt-1">
                    <button
                      onClick={() => setStreakModalView("categories")}
                      className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl transition shadow-sm text-center flex items-center justify-center gap-1 text-[11px]"
                    >
                      ⚡ Start Daily Streak Game
                    </button>
                    <button
                      onClick={() => setStreakModalView("leaderboard")}
                      className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold rounded-xl transition text-center flex items-center justify-center gap-1 text-[11px]"
                    >
                      📊 View Daily Results
                    </button>
                  </div>
                </div>
              )}

              {/* View 2: categories (Choose Your Daily Brain Game) */}
              {streakModalView === "categories" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 text-xs flex items-center justify-center gap-1">
                      <span>🎮</span> Choose Your Daily Brain Game
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Play a mini-game to train working memory, logic, focus & speed thinking.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "rule_switch", name: "Rule Switch", desc: "Mental Flexibility & Rapid Adaptability", emoji: "⚡", bg: "bg-amber-50/60 hover:bg-amber-100/60 border-amber-200 text-amber-950" },
                      { id: "sequence_memory", name: "Sequence Memory", desc: "Spatial & Pattern Working Memory", emoji: "🧠", bg: "bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 text-blue-950" },
                      { id: "word_scramble", name: "Word Unscramble", desc: "Vocabulary & Pattern Recognition", emoji: "💡", bg: "bg-purple-50/60 hover:bg-purple-100/60 border-purple-200 text-purple-950" },
                      { id: "dual_task", name: "Dual Task", desc: "Multi-Rule Attention & Focus", emoji: "🎯", bg: "bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200 text-emerald-950" }
                    ].map(game => (
                      <button
                        key={game.id}
                        onClick={() => {
                          setSelectedBrainGame(game.id);
                          setStreakModalView("levels");
                        }}
                        className={`p-3.5 border rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-2xs ${game.bg}`}
                      >
                        <span className="text-3xl">{game.emoji}</span>
                        <span className="font-bold text-xs mt-0.5">{game.name}</span>
                        <span className="text-[9px] text-gray-500 font-medium leading-snug">{game.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStreakModalView("leaderboard")}
                      className="flex-1 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-xl text-center text-xs transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      📊 View Daily Results Board
                    </button>
                    <button
                      onClick={() => setStreakModalView("rewards")}
                      className="flex-1 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl text-center text-xs transition cursor-pointer"
                    >
                      Back to Stats
                    </button>
                  </div>
                </div>
              )}

              {/* View 3: levels (Select Level 1 to 100 with 10 Levels per Page) */}
              {streakModalView === "levels" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 text-xs flex items-center justify-center gap-1.5 uppercase font-serif">
                      <span>🏆</span> Select Level ({(levelPage - 1) * 10 + 1} - {levelPage * 10} of 100)
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Complete Level 1 to unlock Level 2. Green badges show finished levels!
                    </p>
                  </div>

                  {/* Level Page Pagination Controls */}
                  <div className="flex items-center justify-between px-1">
                    <button
                      disabled={levelPage <= 1}
                      onClick={() => setLevelPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      ◄ Prev 10
                    </button>
                    <span className="text-[10px] font-bold text-[#4A2711]">
                      Page {levelPage} of 10
                    </span>
                    <button
                      disabled={levelPage >= 10}
                      onClick={() => setLevelPage(prev => Math.min(10, prev + 1))}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Next 10 ►
                    </button>
                  </div>

                  {/* Level Grid (10 Level Buttons per Page) */}
                  <div className="grid grid-cols-5 gap-2 my-2">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const lvl = (levelPage - 1) * 10 + idx + 1;
                      const completedList = completedGameLevels[selectedBrainGame] || [];
                      const isCompleted = completedList.includes(lvl);
                      const isUnlocked = lvl === 1 || completedList.includes(lvl - 1) || isCompleted;

                      let btnStyle = "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed";
                      if (isCompleted) {
                        btnStyle = "bg-green-500 border-green-600 text-white font-black shadow-sm hover:bg-green-600 cursor-pointer";
                      } else if (isUnlocked) {
                        btnStyle = "bg-[#4A2711] border-[#4A2711] text-white font-bold shadow-sm hover:bg-[#5c3216] cursor-pointer animate-pulse";
                      }

                      return (
                        <button
                          key={lvl}
                          disabled={!isUnlocked}
                          onClick={() => {
                            if (isCompleted) {
                              setViewingLevelResult(lvl);
                              setStreakModalView("level_result");
                            } else {
                              setSelectedGameLevel(lvl);
                              setBrainGameScore(0);
                              setBrainGameRound(0);
                              setGameTimerSeconds(0);
                              setGameTimerActive(true);
                              setStreakModalView("playing");
                              startBrainGameRound(selectedBrainGame, 0, lvl);
                            }
                          }}
                          className={`h-11 rounded-xl border flex flex-col items-center justify-center text-xs transition duration-150 relative ${btnStyle}`}
                        >
                          <span className="font-mono font-bold text-xs">L{lvl}</span>
                          <span className="text-[8px] font-semibold">
                            {isCompleted ? "✓ Result" : isUnlocked ? "Play" : "🔒 Lock"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStreakModalView("leaderboard")}
                      className="flex-1 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-xl text-center text-xs transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      📊 Daily Results Board
                    </button>
                    <button
                      onClick={() => setStreakModalView("categories")}
                      className="flex-1 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl text-center text-xs transition cursor-pointer"
                    >
                      Back to Games List
                    </button>
                  </div>
                </div>
              )}

              {/* View 7: level_result (Per-Level Scorecard Modal View when Clicking Green Box) */}
              {streakModalView === "level_result" && viewingLevelResult && (() => {
                const key = `quicksolv_level_result_${selectedBrainGame}_${viewingLevelResult}`;
                const saved = localStorage.getItem(key);
                const data = saved ? JSON.parse(saved) : { score: 120, timeSec: gameFinalTime || 42, dateCompleted: "Today", timeCompleted: "" };

                return (
                  <div className="space-y-4 py-1 text-center">
                    <span className="text-4xl animate-bounce">🏆</span>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-gray-900 font-serif">
                        Level {viewingLevelResult} Saved Results
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        {selectedBrainGame === "rule_switch" && "⚡ Rule Switch"}
                        {selectedBrainGame === "sequence_memory" && "🧠 Sequence Memory"}
                        {selectedBrainGame === "word_scramble" && "💡 Word Unscramble"}
                        {selectedBrainGame === "dual_task" && "🎯 Dual Task"}
                      </p>
                    </div>

                    <div className="my-3 p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl max-w-xs mx-auto space-y-2">
                      <div className="flex justify-around items-center">
                        <div>
                          <div className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">BRAIN SCORE</div>
                          <div className="text-xl font-black text-emerald-950">{data.score} / 120</div>
                        </div>
                        <div className="h-8 w-px bg-emerald-200" />
                        <div>
                          <div className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">TIME TAKEN</div>
                          <div className="text-xl font-black text-emerald-950">⏱️ {data.timeSec}s</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-emerald-200/60 text-[9.5px] font-semibold text-emerald-800">
                        ✓ Completed on {data.dateCompleted} {data.timeCompleted ? `at ${data.timeCompleted}` : ""}
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          setSelectedGameLevel(viewingLevelResult);
                          setBrainGameScore(0);
                          setBrainGameRound(0);
                          setGameTimerSeconds(0);
                          setGameTimerActive(true);
                          setStreakModalView("playing");
                          startBrainGameRound(selectedBrainGame, 0, viewingLevelResult);
                        }}
                        className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl shadow-sm transition cursor-pointer text-xs"
                      >
                        🎮 Replay Level {viewingLevelResult}
                      </button>
                      <button
                        onClick={() => setStreakModalView("levels")}
                        className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition cursor-pointer text-xs"
                      >
                        Back to Levels
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* View 4: playing (Interactive Brain Mini-Game Canvas with Real-Time Timer) */}
              {streakModalView === "playing" && (
                <div className="space-y-4">
                  
                  {/* Game Header Progress */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 border-b border-gray-100 pb-2">
                    <span className="uppercase text-[#4A2711] flex items-center gap-1.5">
                      {selectedBrainGame === "rule_switch" && `⚡ Rule Switch (Lvl ${selectedGameLevel})`}
                      {selectedBrainGame === "sequence_memory" && `🧠 Sequence Memory (Lvl ${selectedGameLevel})`}
                      {selectedBrainGame === "word_scramble" && `💡 Word Unscramble (Lvl ${selectedGameLevel})`}
                      {selectedBrainGame === "dual_task" && `🎯 Dual Task (Lvl ${selectedGameLevel})`}
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold animate-pulse">
                        ⏱️ {gameTimerSeconds}s
                      </span>
                    </span>
                    <span>ROUND {brainGameRound + 1} OF 8</span>
                  </div>

                  {/* GAME 1: RULE SWITCH */}
                  {selectedBrainGame === "rule_switch" && ruleSwitchCurrent && (
                    <div className="space-y-4 py-2">
                      <div className="bg-[#FAF6F0] border border-[#EADDC9] p-4 rounded-2xl text-center space-y-1.5">
                        <span className="text-[9px] font-extrabold text-[#4A2711] uppercase tracking-wider">⚡ Dynamic Rule</span>
                        <h3 className="text-xl font-black text-gray-900 font-serif">{ruleSwitchCurrent.rule}</h3>
                        <p className="text-[10px] text-gray-500">{ruleSwitchCurrent.desc}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {ruleSwitchCurrent.options.map((opt: string, idx: number) => (
                          <button
                            key={`${opt}-${idx}`}
                            onClick={() => {
                              setRuleSwitchSelected(opt);
                              const isCorrect = opt === ruleSwitchCurrent.correct;
                              const addScore = isCorrect ? 15 : 0;
                              const newTotal = brainGameScore + addScore;

                              setTimeout(() => {
                                if (brainGameRound < 7) {
                                  setBrainGameScore(newTotal);
                                  const nextR = brainGameRound + 1;
                                  setBrainGameRound(nextR);
                                  startBrainGameRound("rule_switch", nextR, selectedGameLevel);
                                } else {
                                  setBrainGameScore(newTotal);
                                  handleFinishLevel(newTotal);
                                }
                              }, 300);
                            }}
                            className={`p-4 rounded-2xl border text-center font-black text-base transition cursor-pointer ${
                              ruleSwitchSelected === opt
                                ? opt === ruleSwitchCurrent.correct
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : "bg-rose-500 text-white border-rose-600"
                                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GAME 2: SEQUENCE MEMORY */}
                  {selectedBrainGame === "sequence_memory" && (
                    <div className="space-y-4 text-center py-1">
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 text-xs">
                          {sequencePhase === "preview" ? "👀 Memorize the item sequence!" : "👉 Tap sequence in exact order!"}
                        </h4>
                        <p className="text-[9.5px] text-gray-400">
                          {sequencePhase === "preview" ? "Watch highlights carefully..." : `Tapped: ${sequenceUser.length} / ${sequenceTarget.length}`}
                        </p>
                      </div>

                      {/* Display Target Sequence / Interactive Board */}
                      <div className="flex justify-center gap-2 py-3 min-h-[60px]">
                        {sequenceTarget.map((item, idx) => (
                          <div
                            key={idx}
                            className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg transition duration-300 ${
                              activeSeqIndex === idx
                                ? "bg-amber-400 border-amber-500 scale-110 shadow-lg animate-bounce"
                                : sequencePhase === "recall"
                                ? "bg-gray-100 border-gray-200 text-transparent"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }`}
                          >
                            {activeSeqIndex === idx ? item : sequencePhase === "preview" ? item : "❓"}
                          </div>
                        ))}
                      </div>

                      {/* Recall Buttons */}
                      {sequencePhase === "recall" && (
                        <div className="grid grid-cols-4 gap-2 max-w-[280px] mx-auto">
                          {["🟦", "🟢", "🔴", "🟡", "🟣", "🟧", "⭐", "💎"].map((symbol) => (
                            <button
                              key={symbol}
                              onClick={() => {
                                const nextUserSeq = [...sequenceUser, symbol];
                                setSequenceUser(nextUserSeq);

                                if (nextUserSeq.length === sequenceTarget.length) {
                                  const isCorrect = sequenceTarget.every((val, i) => val === nextUserSeq[i]);
                                  const addScore = isCorrect ? 15 : 5;
                                  const newTotal = brainGameScore + addScore;

                                  if (brainGameRound < 7) {
                                    setBrainGameScore(newTotal);
                                    const nextR = brainGameRound + 1;
                                    setBrainGameRound(nextR);
                                    startBrainGameRound("sequence_memory", nextR, selectedGameLevel);
                                  } else {
                                    setBrainGameScore(newTotal);
                                    handleFinishLevel(newTotal);
                                  }
                                }
                              }}
                              className="w-16 h-12 rounded-xl bg-white border border-gray-200 hover:bg-amber-50/50 hover:border-amber-300 text-xl flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GAME 3: WORD UNSCRAMBLE */}
                  {selectedBrainGame === "word_scramble" && wordScrambleCurrent && (
                    <div className="space-y-4 py-2">
                      <div className="bg-[#FAF6F0] border border-[#EADDC9] p-4 rounded-2xl text-center space-y-1.5">
                        <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-wider">Unscramble the Concept</span>
                        <h3 className="text-xl font-black text-[#4A2711] tracking-widest font-mono">{wordScrambleCurrent.scrambled}</h3>
                        <p className="text-[10px] text-gray-500 italic pr-1">💡 Hint: {wordScrambleCurrent.clue}</p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={unscrambleInput}
                          onChange={(e) => setUnscrambleInput(e.target.value.toUpperCase())}
                          placeholder="Type unscrambled word..."
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-bold uppercase tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2711]"
                        />
                        
                        <button
                          onClick={() => {
                            const isCorrect = unscrambleInput.trim().toUpperCase() === wordScrambleCurrent.word;
                            const addScore = isCorrect ? 15 : 0;
                            const newTotal = brainGameScore + addScore;

                            if (brainGameRound < 7) {
                              setBrainGameScore(newTotal);
                              const nextR = brainGameRound + 1;
                              setBrainGameRound(nextR);
                              startBrainGameRound("word_scramble", nextR, selectedGameLevel);
                            } else {
                              setBrainGameScore(newTotal);
                              handleFinishLevel(newTotal);
                            }
                          }}
                          className="w-full py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl transition cursor-pointer shadow-sm text-xs"
                        >
                          Submit Answer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GAME 4: DUAL TASK */}
                  {selectedBrainGame === "dual_task" && dualTaskCurrent && (
                    <div className="space-y-4 py-2">
                      <div className="bg-[#FAF6F0] border border-[#EADDC9] p-4 rounded-2xl text-center space-y-1">
                        <span className="text-[9px] font-bold text-[#4A2711] uppercase tracking-wider">🎯 Dual Condition Task</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-gray-900">{dualTaskCurrent.rule1}</p>
                          <p className="text-xs font-bold text-amber-800">{dualTaskCurrent.rule2}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {dualTaskCurrent.items.map((item: any) => {
                          const isSelected = dualTaskUserSelected.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (isSelected) {
                                  setDualTaskUserSelected(prev => prev.filter(i => i !== item.id));
                                } else {
                                  setDualTaskUserSelected(prev => [...prev, item.id]);
                                }
                              }}
                              className={`p-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#4A2711] text-white border-[#4A2711] scale-95 shadow-sm"
                                  : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"
                              }`}
                            >
                              {item.val}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => {
                          const correctItemIds = dualTaskCurrent.items.filter((i: any) => i.isCorrect).map((i: any) => i.id);
                          const isCorrect = correctItemIds.length === dualTaskUserSelected.length && correctItemIds.every((id: number) => dualTaskUserSelected.includes(id));
                          const addScore = isCorrect ? 15 : 5;
                          const newTotal = brainGameScore + addScore;

                          if (brainGameRound < 7) {
                            setBrainGameScore(newTotal);
                            const nextR = brainGameRound + 1;
                            setBrainGameRound(nextR);
                            startBrainGameRound("dual_task", nextR, selectedGameLevel);
                          } else {
                            setBrainGameScore(newTotal);
                            handleFinishLevel(newTotal);
                          }
                        }}
                        className="w-full py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl transition cursor-pointer shadow-sm text-xs mt-2"
                      >
                        Submit Selected Items
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* View 5: score (Trophy, Daily Streak & Today's Results Board) */}
              {streakModalView === "score" && (
                <div className="space-y-4 py-1 text-center">
                  <span className="text-4xl animate-bounce">🏆</span>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-gray-900 font-serif">Level {selectedGameLevel} Completed!</h4>
                    <p className="text-[10px] text-gray-500 font-semibold">
                      {streakEarnedNewToday 
                        ? `🎉 +1 Day added! Your Daily Streak is now ${streakCount} Days! 🔥`
                        : `🔥 Daily Streak Credit Secured! (${streakCount} Days Active)`}
                    </p>
                  </div>

                  {/* Score & Time Summary */}
                  <div className="my-2 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl max-w-xs mx-auto flex justify-around items-center">
                    <div>
                      <div className="text-[9px] text-amber-800 font-bold uppercase tracking-wider">BRAIN SCORE</div>
                      <div className="text-xl font-black text-[#4A2711]">{brainGameScore} / 120</div>
                    </div>
                    <div className="h-8 w-px bg-amber-200" />
                    <div>
                      <div className="text-[9px] text-amber-800 font-bold uppercase tracking-wider">TIME TAKEN</div>
                      <div className="text-xl font-black text-[#4A2711]">⏱️ {gameFinalTime}s</div>
                    </div>
                  </div>

                  {/* Daily Leaderboard Results Board with Gold/Silver/Bronze */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 space-y-2 text-left shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-[10px] font-extrabold text-gray-900 uppercase font-serif flex items-center gap-1">
                        <span>📊</span> Today's Live Results Board
                      </span>
                      <span className="text-[9px] font-bold text-gray-400">Sorted by Speed</span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {getDailyLeaderboard(selectedBrainGame).length === 0 ? (
                        <div className="py-4 text-center text-gray-500 space-y-1">
                          <p className="text-lg">🚀</p>
                          <p className="font-bold text-xs">No completions recorded today yet!</p>
                          <p className="text-[9.5px] text-gray-400">You just set today's first 100% real speed record!</p>
                        </div>
                      ) : (
                        getDailyLeaderboard(selectedBrainGame).map((player: any, rankIdx: number) => {
                          const rank = rankIdx + 1;
                          let badgeStyle = "bg-gray-50 border-gray-200 text-gray-700";
                          let medal = `#${rank}`;

                          if (rank === 1) {
                            badgeStyle = "bg-amber-100/90 border-amber-300 text-amber-950 font-bold shadow-2xs";
                            medal = "🥇 1st";
                          } else if (rank === 2) {
                            badgeStyle = "bg-slate-100/90 border-slate-300 text-slate-900 font-bold shadow-2xs";
                            medal = "🥈 2nd";
                          } else if (rank === 3) {
                            badgeStyle = "bg-orange-100/80 border-orange-300 text-orange-950 font-bold shadow-2xs";
                            medal = "🥉 3rd";
                          }

                          return (
                            <div
                              key={rankIdx}
                              className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${badgeStyle} ${
                                player.isCurrentUser ? "ring-2 ring-[#4A2711]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs shrink-0 font-bold">{medal}</span>
                                <span className="text-base shrink-0">{player.avatar}</span>
                                <span className="font-bold truncate text-[11px]">
                                  {player.name} {player.isCurrentUser ? "(You)" : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono font-bold">
                                <span>⏱️ {player.timeSec}s</span>
                                <span className="text-emerald-700">{player.score} pts</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        setBrainGameScore(0);
                        setBrainGameRound(0);
                        setStreakModalView("levels");
                      }}
                      className="flex-1 py-2.5 bg-white border border-[#4A2711] text-[#4A2711] font-bold rounded-xl hover:bg-[#4A2711]/5 transition cursor-pointer text-xs"
                    >
                      🎮 Play Next Level
                    </button>
                    <button
                      onClick={() => setShowStreakModal(false)}
                      className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl shadow-sm transition cursor-pointer text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* View 6: leaderboard (Dedicated Daily Results & Speed Times Board) */}
              {streakModalView === "leaderboard" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 text-xs flex items-center justify-center gap-1.5 uppercase font-serif">
                      <span>📊</span> Today's Daily Live Results Board
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Real-time player rankings sorted by fastest completion speed!
                    </p>
                  </div>

                  {/* Game Selector Tabs */}
                  <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl text-[9.5px] font-bold">
                    {[
                      { id: "rule_switch", label: "⚡ Rule Switch" },
                      { id: "sequence_memory", label: "🧠 Sequence" },
                      { id: "word_scramble", label: "💡 Unscramble" },
                      { id: "dual_task", label: "🎯 Dual Task" }
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedBrainGame(g.id)}
                        className={`py-1.5 rounded-lg transition ${
                          selectedBrainGame === g.id
                            ? "bg-[#4A2711] text-white shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  {/* Leaderboard List */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 space-y-2 text-left shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-[10px] font-extrabold text-gray-900 uppercase font-serif flex items-center gap-1">
                        <span>🏆</span> Solvers Today ({getDailyLeaderboard(selectedBrainGame).length} Members)
                      </span>
                      <span className="text-[9px] font-bold text-gray-400">Fastest Solvers</span>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {getDailyLeaderboard(selectedBrainGame).length === 0 ? (
                        <div className="py-6 text-center text-gray-500 space-y-1.5">
                          <p className="text-2xl">🚀</p>
                          <p className="font-bold text-xs text-gray-800">No completions recorded today yet!</p>
                          <p className="text-[10px] text-gray-400">Play a level to set today's first 100% real speed record!</p>
                        </div>
                      ) : (
                        getDailyLeaderboard(selectedBrainGame).map((player: any, rankIdx: number) => {
                          const rank = rankIdx + 1;
                          let badgeStyle = "bg-gray-50 border-gray-200 text-gray-700";
                          let medal = `#${rank}`;

                          if (rank === 1) {
                            badgeStyle = "bg-amber-100/90 border-amber-300 text-amber-950 font-bold shadow-2xs";
                            medal = "🥇 1st";
                          } else if (rank === 2) {
                            badgeStyle = "bg-slate-100/90 border-slate-300 text-slate-900 font-bold shadow-2xs";
                            medal = "🥈 2nd";
                          } else if (rank === 3) {
                            badgeStyle = "bg-orange-100/80 border-orange-300 text-orange-950 font-bold shadow-2xs";
                            medal = "🥉 3rd";
                          }

                          return (
                            <div
                              key={rankIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${badgeStyle} ${
                                player.isCurrentUser ? "ring-2 ring-[#4A2711]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs shrink-0 font-bold">{medal}</span>
                                <span className="text-base shrink-0">{player.avatar}</span>
                                <span className="font-bold truncate text-[11px]">
                                  {player.name} {player.isCurrentUser ? "(You)" : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono font-bold">
                                <span className="bg-amber-200/60 px-2 py-0.5 rounded-full text-amber-950">⏱️ {player.timeSec}s</span>
                                <span className="text-emerald-700">{player.score} pts</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStreakModalView("categories")}
                      className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] text-white font-bold rounded-xl text-center text-xs transition cursor-pointer"
                    >
                      🎮 Play Brain Games Now
                    </button>
                    <button
                      onClick={() => setStreakModalView("rewards")}
                      className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-center text-xs transition cursor-pointer"
                    >
                      Back to Stats
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
        {showEditAllModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-905 font-serif">Edit Profile Information</h3>
                <button
                  onClick={() => setShowEditAllModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-650 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  handleSaveProfile({
                    fullName: target.fullName.value,
                    emailAddress: target.emailAddress.value,
                    phoneNumber: target.phoneNumber.value,
                    dob: target.dob.value,
                    gender: target.gender.value,
                    location: target.location.value,
                    aboutMe: target.aboutMe.value
                  });
                  setShowEditAllModal(false);
                }}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    defaultValue={profileData.fullName}
                    placeholder="Ananya Kumar"
                    className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    name="emailAddress"
                    defaultValue={profileData.emailAddress}
                    placeholder="ananya.kumar25@gmail.com"
                    className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      name="phoneNumber"
                      defaultValue={profileData.phoneNumber}
                      placeholder="+91 98765 43210"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="text"
                      name="dob"
                      defaultValue={profileData.dob}
                      placeholder="12 March 2003"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Gender</label>
                    <input
                      type="text"
                      name="gender"
                      defaultValue={profileData.gender}
                      placeholder="Female"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Location</label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={profileData.location}
                      placeholder="Bengaluru, Karnataka, India"
                      className="w-full p-2 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">About Me</label>
                  <textarea
                    name="aboutMe"
                    defaultValue={profileData.aboutMe}
                    placeholder="Tell us about yourself..."
                    rows={2}
                    className="w-full p-2 rounded-xl border border-gray-205 focus:ring-1 focus:ring-[#4A2711] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditAllModal(false)}
                    className="flex-1 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold rounded-xl transition text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#4A2711] hover:bg-[#5c3216] text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreatePlanModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-xs font-sans">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className="text-sm font-bold text-gray-905 font-serif">Create AI Study Schedule</h3>
                </div>
                <button
                  onClick={() => setShowCreatePlanModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleGenerateStudyPlan} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={planSubject}
                    onChange={(e) => setPlanSubject(e.target.value)}
                    placeholder="e.g. Physics, Biochemistry, Computer Science"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Target Topic / Exam Focus</label>
                  <input
                    type="text"
                    required
                    value={planTopic}
                    onChange={(e) => setPlanTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws, Cellular Respiration"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Difficulty Level</label>
                    <select
                      value={planDifficulty}
                      onChange={(e) => setPlanDifficulty(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none text-[11px] bg-white cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Daily Minutes Goal</label>
                    <select
                      value={planDailyMinutes}
                      onChange={(e) => setPlanDailyMinutes(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none text-[11px] bg-white cursor-pointer"
                    >
                      <option value={30}>30 mins / day</option>
                      <option value={60}>60 mins / day</option>
                      <option value={120}>120 mins / day</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wider">Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={planTargetDate}
                    onChange={(e) => setPlanTargetDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-[#4A2711] focus:outline-none text-[11px] cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-2.5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreatePlanModal(false)}
                    className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-bold rounded-xl transition text-gray-700 border border-gray-200/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={planIsGenerating}
                    className="flex-1 py-2.5 bg-[#4A2711] hover:bg-[#5c3216] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {planIsGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Generating Roadmap...
                      </>
                    ) : (
                      "Generate Plan"
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* DELETE CHAT CONFIRMATION MODAL */}
        {deletingConv && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 font-bold shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 font-serif">Delete Chat Confirmation</h3>
                    <p className="text-xs text-gray-500">Permanent conversation deletion</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingConv(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-red-900">
                  Are you sure you want to delete this chat?
                </div>
                <p className="text-xs text-red-700/90 leading-relaxed">
                  "<span className="font-bold text-red-950">{deletingConv.title || "Untitled Chat"}</span>" will be permanently deleted along with all its messages and solutions.
                </p>
                <div className="pt-1">
                  <mark style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px", display: "inline-block" }}>
                    ⚠️ Permanent Action: 1 deleted, it won't be returned.
                  </mark>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingConv(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteConversation(deletingConv)}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Chat Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RENAME CHAT HEADING MODAL */}
        {renamingConv && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5EE] border border-[#EADDC9]/60 flex items-center justify-center text-[#4A2711] font-bold shrink-0">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 font-serif">Rename Chat Heading</h3>
                    <p className="text-xs text-gray-500">Edit custom title for your chat session</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRenamingConv(null);
                    setRenameInputTitle("");
                  }}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  Chat Heading / Title
                </label>
                <input
                  type="text"
                  value={renameInputTitle}
                  onChange={(e) => setRenameInputTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenameConversation(renamingConv, renameInputTitle);
                    }
                  }}
                  placeholder="Enter new chat heading..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#4A2711] focus:outline-none font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setRenamingConv(null);
                    setRenameInputTitle("");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRenameConversation(renamingConv, renameInputTitle)}
                  disabled={!renameInputTitle.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#4A2711] hover:bg-[#381d0c] disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Heading
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#FCF9F5]">
        <div className="w-8 h-8 rounded-full border-2 border-[#4A2711]/30 border-t-[#4A2711] animate-spin"></div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
