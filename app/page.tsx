"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Person = string;
type GoalType = "relocation" | "wedding" | "custom";
type TaskSource = "ai" | "manual";

type Member = {
  id: string;
  name: string;
  color: string;
};

type Task = {
  id: number;
  owner: Person;
  title: string;
  note: string;
  stage: number;
  points: number;
  done: boolean;
  source: TaskSource;
};

type PlanStage = {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
};

type Comment = {
  id: number;
  author: string;
  text: string;
  date: string;
};

type GoalProfile = {
  type: GoalType;
  title: string;
  target: string;
  icon: string;
  description: string;
  deadline: string;
  budget: number;
  details: string[];
};

type AgentSummary = {
  intent: string;
  input: string;
  context: string[];
  assumptions: string[];
  generatedAt: string;
};

type QuestState = {
  tasks: Task[];
  stages: PlanStage[];
  savings: {
    contributions: Record<string, number>;
    goal: number;
  };
  comments: Comment[];
  members: Member[];
  goal: GoalProfile;
  agent: AgentSummary;
};

type GoalDraft = {
  type: GoalType;
  description: string;
  country: string;
  moveReason: string;
  weddingFormat: "family" | "large";
  guestCount: string;
  city: string;
  deadline: string;
  budget: string;
};

type GeneratedPlan = {
  goal: GoalProfile;
  stages: PlanStage[];
  tasks: Task[];
  agent: AgentSummary;
  savingsGoal: number;
};

const STORAGE_KEY = "together-quest-ai-demo-v2";
const sharedOwner = "Общее";
const palette = ["#8d77e8", "#319bd7", "#f48c66", "#d65e9c", "#5fa969", "#e2a52d"];

const countryOptions = [
  { country: "Малайзия", flag: "🇲🇾", to: "Малайзию", inside: "Малайзии", of: "Малайзии" },
  { country: "Польша", flag: "🇵🇱", to: "Польшу", inside: "Польше", of: "Польши" },
  { country: "Франция", flag: "🇫🇷", to: "Францию", inside: "Франции", of: "Франции" },
  { country: "Армения", flag: "🇦🇲", to: "Армению", inside: "Армении", of: "Армении" },
  { country: "Таиланд", flag: "🇹🇭", to: "Таиланд", inside: "Таиланде", of: "Таиланда" },
  { country: "Индонезия", flag: "🇮🇩", to: "Индонезию", inside: "Индонезии", of: "Индонезии" },
  {
    country: "Другая страна",
    flag: "🌍",
    to: "выбранную страну",
    inside: "выбранной стране",
    of: "выбранной страны",
  },
];

const agentSteps = [
  { title: "Распознаю тип цели", note: "Определяю сценарий и ожидаемый результат" },
  { title: "Собираю контекст", note: "Учитываю участников, срок, бюджет и ограничения" },
  { title: "Выстраиваю зависимости", note: "Сначала обязательные шаги, затем опциональные" },
  { title: "Распределяю задачи", note: "Разделяю личные и совместные действия" },
  { title: "Проверяю нагрузку", note: "Дроблю большие дела на выполнимые шаги" },
];

const seedMembers: Member[] = [
  { id: "Musya", name: "Musya", color: palette[0] },
  { id: "Tank", name: "Tank", color: palette[1] },
];

const seedDraft: GoalDraft = {
  type: "relocation",
  description:
    "Мы хотим переехать вдвоём в Малайзию к осени 2027 года: я поступаю в магистратуру, партнёр — на бакалавриат.",
  country: "Малайзия",
  moveReason: "Учёба",
  weddingFormat: "family",
  guestCount: "25",
  city: "Санкт-Петербург",
  deadline: "2027-09",
  budget: "500000",
};

function deadlineLabel(value: string) {
  if (!value) return "срок не указан";
  const [year, month] = value.split("-").map(Number);
  const months = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];
  return month && year ? `${months[month - 1]} ${year}` : value;
}

function participantsLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} участников`;
  if (last === 1) return `${count} участник`;
  if (last >= 2 && last <= 4) return `${count} участника`;
  return `${count} участников`;
}

function defaultDraft(type: GoalType): GoalDraft {
  if (type === "wedding") {
    return {
      type,
      description:
        "Хотим организовать тёплую семейную свадьбу без перегруза и всё подготовить вместе.",
      country: "Малайзия",
      moveReason: "Учёба",
      weddingFormat: "family",
      guestCount: "25",
      city: "Санкт-Петербург",
      deadline: "2027-06",
      budget: "600000",
    };
  }
  if (type === "custom") {
    return {
      type,
      description:
        "Хотим запустить совместный онлайн-проект и получить первых десять клиентов.",
      country: "Малайзия",
      moveReason: "Другое",
      weddingFormat: "family",
      guestCount: "25",
      city: "",
      deadline: "2027-03",
      budget: "150000",
    };
  }
  return { ...seedDraft };
}

function generatedTask(
  id: number,
  stage: number,
  owner: Person,
  title: string,
  note: string,
  points = 20,
): Task {
  return { id, stage, owner, title, note, points, done: false, source: "ai" };
}

function generatePlan(
  draft: GoalDraft,
  members: Member[],
  baseId = Date.now(),
  generatedAt = "только что",
): GeneratedPlan {
  const first = members[0]?.id ?? sharedOwner;
  const second = members[1]?.id ?? first;
  const budget = Math.max(Number(draft.budget) || 0, 0);
  const deadline = deadlineLabel(draft.deadline);
  let nextId = baseId;
  const task = (
    stage: number,
    owner: Person,
    title: string,
    note: string,
    points = 20,
  ) => generatedTask(nextId++, stage, owner, title, note, points);

  if (draft.type === "wedding") {
    const isFamily = draft.weddingFormat === "family";
    const format = isFamily ? "семейная" : "большая";
    const guests = Math.max(Number(draft.guestCount) || (isFamily ? 25 : 100), 2);
    const city = draft.city.trim() || "город пока не выбран";
    const stages: PlanStage[] = [
      { id: 1, title: "Концепция", subtitle: "Договариваемся о главном", icon: "💍" },
      { id: 2, title: "Бюджет и гости", subtitle: "Фиксируем рамки", icon: "🧾" },
      { id: 3, title: "Площадка и команда", subtitle: "Бронируем основу", icon: "🏛️" },
      { id: 4, title: "Детали дня", subtitle: "Собираем атмосферу", icon: "✨" },
      { id: 5, title: "Подтверждения", subtitle: "Проверяем каждую связь", icon: "✅" },
      { id: 6, title: "Свадьба", subtitle: "Проживаем день вместе", icon: "🥂" },
    ];
    const tasks = [
      task(1, sharedOwner, "Согласовать три главных приоритета", `Формат: ${format} свадьба · ориентир: ${guests} гостей`, 30),
      task(1, first, "Собрать референсы атмосферы", "Цвет, настроение, одежда и уровень формальности"),
      task(1, second, "Предложить три диапазона дат", `Финальный ориентир — ${deadline}`),
      task(2, sharedOwner, "Утвердить верхнюю границу бюджета", `Не больше ${budget.toLocaleString("ru-RU")} ₽ без отдельного решения`, 30),
      task(2, first, "Собрать первую версию списка гостей", `Цель — около ${guests} человек, с разделением по приоритету`),
      task(2, second, "Разложить бюджет по категориям", "Площадка, еда, образы, фото, декор и резерв"),
      task(3, first, "Собрать шорт-лист площадок", `${city}: сравнить вместимость, меню, ограничения и стоимость`, 30),
      task(3, second, "Запросить предложения у подрядчиков", "Фото, ведущий или координатор — только нужные формату роли"),
      task(3, sharedOwner, "Выбрать площадку по единой таблице", "Не только по картинке: договор, логистика, план Б и итоговая цена", 40),
      task(4, first, "Подготовить приглашение и форму ответа", "Срок ответа, плюс один, питание и контакты"),
      task(4, second, "Собрать черновой тайминг дня", "Заложить паузы, дорогу и время без программы"),
      task(4, sharedOwner, "Утвердить меню и формат рассадки", `Проверить, подходит ли решение для ${guests} гостей`, 30),
      task(5, first, "Сверить ответы гостей", "Подтвердить присутствие и особые требования"),
      task(5, second, "Собрать контакты и платежи в один чек-лист", "Договоры, дедлайны, остатки и ответственные"),
      task(5, sharedOwner, "Провести финальный созвон с площадкой", "Тайминг, доступ подрядчиков, план Б и закрытие вечера", 40),
      task(6, sharedOwner, "Передать тайминг ответственному человеку", "В день свадьбы пара не управляет каждым процессом"),
      task(6, first, "Собрать личный набор на день", "Документы, одежда, вода, зарядка и необходимые мелочи"),
      task(6, sharedOwner, "Оставить в расписании время только для вас", "Не превращать важный день в бесконечный чек-лист", 100),
    ];
    const context = [
      `${format[0].toUpperCase()}${format.slice(1)} свадьба`,
      `${guests} гостей`,
      city,
      deadline,
      participantsLabel(members.length),
    ];
    return {
      goal: {
        type: draft.type,
        title: `${isFamily ? "Семейная" : "Большая"} свадьба`,
        target: "день свадьбы",
        icon: "💍",
        description: draft.description.trim(),
        deadline: draft.deadline,
        budget,
        details: context,
      },
      stages,
      tasks,
      savingsGoal: budget,
      agent: {
        intent: "Подготовка свадьбы",
        input: draft.description.trim(),
        context,
        assumptions: [
          "Агент предлагает структуру, но не заключает договоры и не совершает платежи.",
          "Стоимость и условия подрядчиков нужно подтвердить перед бронированием.",
        ],
        generatedAt,
      },
    };
  }

  if (draft.type === "custom") {
    const shortGoal =
      draft.description.trim().replace(/[.!?]+$/, "").slice(0, 54) || "Совместная цель";
    const stages: PlanStage[] = [
      { id: 1, title: "Фокус", subtitle: "Определяем результат", icon: "🎯" },
      { id: 2, title: "Исследование", subtitle: "Проверяем путь", icon: "🔎" },
      { id: 3, title: "Ресурсы", subtitle: "Собираем необходимое", icon: "🧰" },
      { id: 4, title: "Первый запуск", subtitle: "Проверяем на практике", icon: "🧪" },
      { id: 5, title: "Улучшение", subtitle: "Исправляем по фактам", icon: "📈" },
      { id: 6, title: "Результат", subtitle: "Закрепляем достижение", icon: "🏆" },
    ];
    const tasks = [
      task(1, sharedOwner, "Сформулировать измеримый результат", `Исходное описание: «${shortGoal}»`, 30),
      task(1, first, "Записать личные ожидания", "Что должно измениться после достижения цели"),
      task(1, second, "Определить ограничения", `Срок: ${deadline} · бюджет: ${budget.toLocaleString("ru-RU")} ₽`),
      task(2, first, "Найти три рабочих подхода", "Сравнить время, стоимость и вероятность результата"),
      task(2, second, "Собрать главные риски", "Отметить, что можно проверить заранее"),
      task(2, sharedOwner, "Выбрать один основной маршрут", "Зафиксировать критерий, когда подход нужно менять", 30),
      task(3, first, "Подготовить свою часть ресурсов", "Доступы, знания, контакты или материалы"),
      task(3, second, "Подготовить свою часть ресурсов", "Доступы, знания, контакты или материалы"),
      task(3, sharedOwner, "Создать общий минимальный набор", "Только то, без чего нельзя начать"),
      task(4, first, "Выполнить первый проверяемый шаг", "Получить наблюдаемый результат, а не идеальную заготовку", 40),
      task(4, second, "Собрать обратную связь", "Записать факты и вопросы без преждевременных выводов"),
      task(4, sharedOwner, "Провести короткую ретроспективу", "Что сработало, что мешало, что меняем"),
      task(5, first, "Улучшить самое слабое место", "Одна правка с максимальным влиянием"),
      task(5, second, "Проверить улучшение повторно", "Использовать тот же критерий успеха"),
      task(5, sharedOwner, "Обновить план до дедлайна", `Сохранить реалистичный путь к ${deadline}`, 30),
      task(6, sharedOwner, "Зафиксировать достигнутый результат", "Цифра, событие или готовый артефакт", 60),
      task(6, first, "Описать личный вклад", "Что было сделано и чему удалось научиться"),
      task(6, sharedOwner, "Выбрать следующую общую цель", "Сохранить темп, не увеличивая нагрузку автоматически", 100),
    ];
    const context = [
      "Свободная цель",
      deadline,
      `${budget.toLocaleString("ru-RU")} ₽`,
      participantsLabel(members.length),
    ];
    return {
      goal: {
        type: draft.type,
        title: shortGoal,
        target: "общий результат",
        icon: "🎯",
        description: draft.description.trim(),
        deadline: draft.deadline,
        budget,
        details: context,
      },
      stages,
      tasks,
      savingsGoal: budget,
      agent: {
        intent: "Пользовательская цель",
        input: draft.description.trim(),
        context,
        assumptions: [
          "План построен как проверяемый маршрут и требует уточнения после первых результатов.",
          "Пользователи могут изменить любую предложенную агентом задачу.",
        ],
        generatedAt,
      },
    };
  }

  const country = draft.country.trim() || "выбранную страну";
  const countryData = countryOptions.find((item) => item.country === country);
  const countryTo = countryData?.to ?? country;
  const countryIn = countryData?.inside ?? country;
  const countryOf = countryData?.of ?? country;
  const stages: PlanStage[] = [
    { id: 1, title: "Контекст", subtitle: "Определяем сценарий", icon: "🧭" },
    { id: 2, title: "Документы", subtitle: "Собираем основу", icon: "📁" },
    { id: 3, title: "Финансы и навыки", subtitle: "Укрепляем готовность", icon: "⚡" },
    { id: 4, title: "Выбор маршрута", subtitle: "Сравниваем варианты", icon: "🗺️" },
    { id: 5, title: "Подготовка", subtitle: "Закрываем зависимости", icon: "🚀" },
    { id: 6, title: "Переезд", subtitle: `${country} ждёт`, icon: countryData?.flag ?? "🌍" },
  ];
  const tasks = [
    task(1, sharedOwner, "Согласовать сценарий переезда", `${draft.moveReason}; целевой срок — ${deadline}`, 30),
    task(1, first, "Записать личную цель переезда", "Учёба, карьера и ожидаемый результат через год"),
    task(1, second, "Записать личную цель переезда", "Учёба, карьера и ожидаемый результат через год"),
    task(2, first, "Проверить срок действия документов", "Паспорт и личные документы — без передачи данных агенту"),
    task(2, second, "Собрать документы об образовании и опыте", "Сканы, справки и список того, что требует перевода"),
    task(2, sharedOwner, "Проверить официальные требования", `Только по источникам ведомств и организаций ${countryOf}`, 40),
    task(3, sharedOwner, "Зафиксировать финансовую подушку", `Ориентир — ${budget.toLocaleString("ru-RU")} ₽, затем уточнить после исследования`, 30),
    task(3, first, "Оценить свой языковой уровень", "Записать текущий уровень и минимальный целевой результат"),
    task(3, second, "Выбрать профессиональный или учебный трек", "Один основной и один запасной вариант"),
    task(4, first, "Собрать свой шорт-лист программ или работы", `Сравнить требования и сроки в ${countryIn}`, 30),
    task(4, second, "Собрать свой шорт-лист программ или работы", `Сравнить требования и сроки в ${countryIn}`, 30),
    task(4, sharedOwner, "Сравнить города по единой таблице", "Жильё, транспорт, безопасность, стоимость и возможности", 40),
    task(5, first, "Подать первые заявки", "Не ждать идеального набора — проверить комплект на практике", 50),
    task(5, second, "Подать первые заявки", "Зафиксировать даты, ответы и недостающие документы", 50),
    task(5, sharedOwner, "Собрать план переезда на первые 30 дней", "Жильё, связь, деньги, страховка, транспорт и экстренные контакты"),
    task(6, sharedOwner, "Подтвердить легальное основание и страховку", "Финальная сверка только по официальным документам", 60),
    task(6, sharedOwner, "Забронировать жильё на первый период", "Проверить договор, район и дорогу до ключевых мест", 50),
    task(6, sharedOwner, `Переехать в ${countryTo}`, "Новый уровень открыт — дальше план адаптируется по фактической ситуации", 100),
  ];
  const context = [
    country,
    draft.moveReason,
    deadline,
    `${budget.toLocaleString("ru-RU")} ₽`,
    participantsLabel(members.length),
  ];
  return {
    goal: {
      type: draft.type,
      title: `Переезд в ${countryTo}`,
      target: countryTo,
      icon: countryData?.flag ?? "🌍",
      description: draft.description.trim(),
      deadline: draft.deadline,
      budget,
      details: context,
    },
    stages,
    tasks,
    savingsGoal: budget,
    agent: {
      intent: "Совместный переезд",
      input: draft.description.trim(),
      context,
      assumptions: [
        "Юридические, визовые и финансовые требования нужно подтверждать по официальным источникам.",
        "Агент формирует базовый план, а пользователи принимают решения и редактируют задачи.",
      ],
      generatedAt,
    },
  };
}

const seedPlan = generatePlan(seedDraft, seedMembers, 1000, "30 июля 2026");

const seed: QuestState = {
  members: seedMembers,
  comments: [],
  stages: seedPlan.stages,
  tasks: seedPlan.tasks,
  goal: seedPlan.goal,
  agent: seedPlan.agent,
  savings: {
    contributions: { Musya: 0, Tank: 0 },
    goal: seedPlan.savingsGoal,
  },
};

function normalize(raw: unknown): QuestState {
  if (!raw || typeof raw !== "object") return seed;
  const candidate = raw as Partial<QuestState>;
  if (
    !Array.isArray(candidate.tasks) ||
    !Array.isArray(candidate.stages) ||
    !Array.isArray(candidate.comments) ||
    !Array.isArray(candidate.members) ||
    !candidate.goal ||
    !candidate.agent ||
    !candidate.savings?.contributions
  ) {
    return seed;
  }
  return candidate as QuestState;
}

export default function Home() {
  const [data, setData] = useState<QuestState>(seed);
  const [tab, setTab] = useState<Person>(sharedOwner);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plannerStep, setPlannerStep] = useState<"brief" | "running" | "preview">("brief");
  const [agentProgress, setAgentProgress] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(seedDraft);
  const [newTask, setNewTask] = useState({
    owner: "Musya" as Person,
    title: "",
    note: "",
    stage: 1,
  });
  const [fund, setFund] = useState<{ owner: Person; amount: string }>({
    owner: "Musya",
    amount: "",
  });
  const [comment, setComment] = useState({ author: "Musya", text: "" });
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) window.setTimeout(() => setData(normalize(JSON.parse(saved))), 0);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persist(next: QuestState, message?: string) {
    setData(next);
    setSaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (message) {
        setToast(message);
        window.setTimeout(() => setToast(""), 2400);
      }
    } catch {
      setToast("Браузер не разрешил сохранить изменения.");
    } finally {
      window.setTimeout(() => setSaving(false), 180);
    }
  }

  const doneCount = data.tasks.filter((task) => task.done).length;
  const totalPoints = data.tasks
    .filter((task) => task.done)
    .reduce((sum, task) => sum + task.points, 0);
  const percentage = data.tasks.length
    ? Math.round((doneCount / data.tasks.length) * 100)
    : 0;
  const savingTotal = Object.values(data.savings.contributions).reduce(
    (sum, value) => sum + value,
    0,
  );
  const savingPercent = data.savings.goal
    ? Math.min(100, Math.round((savingTotal / data.savings.goal) * 100))
    : 0;
  const firstIncompleteStage =
    data.stages.find((stage) =>
      data.tasks.some((task) => task.stage === stage.id && !task.done),
    )?.id ??
    data.stages.at(-1)?.id ??
    1;
  const visibleStages = useMemo(
    () =>
      data.stages.map((stage) => ({
        ...stage,
        tasks: data.tasks.filter(
          (task) =>
            task.stage === stage.id &&
            (tab === sharedOwner || task.owner === tab || task.owner === sharedOwner),
        ),
      })),
    [data.stages, data.tasks, tab],
  );

  function member(id: string) {
    return data.members.find((item) => item.id === id);
  }

  function toggleTask(id: number) {
    const selectedTask = data.tasks.find((task) => task.id === id);
    persist(
      {
        ...data,
        tasks: data.tasks.map((task) =>
          task.id === id ? { ...task, done: !task.done } : task,
        ),
      },
      selectedTask?.done
        ? "Задача снова в пути"
        : `+${selectedTask?.points ?? 0} XP — отлично!`,
    );
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: Date.now(),
      ...newTask,
      title: newTask.title.trim(),
      note: newTask.note.trim(),
      points: 20,
      done: false,
      source: "manual",
    };
    persist({ ...data, tasks: [...data.tasks, task] }, "Ваш шаг добавлен");
    setNewTask({ owner: data.members[0]?.id ?? sharedOwner, title: "", note: "", stage: 1 });
    setTaskOpen(false);
  }

  function addFunds(event: FormEvent) {
    event.preventDefault();
    const amount = Number(fund.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    persist(
      {
        ...data,
        savings: {
          ...data.savings,
          contributions: {
            ...data.savings.contributions,
            [fund.owner]: (data.savings.contributions[fund.owner] ?? 0) + amount,
          },
        },
      },
      `+${amount.toLocaleString("ru-RU")} ₽ в общую цель`,
    );
    setFund({ ...fund, amount: "" });
    setFundOpen(false);
  }

  function addComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.text.trim()) return;
    const entry: Comment = {
      id: Date.now(),
      author: comment.author,
      text: comment.text.trim(),
      date: new Date().toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      }),
    };
    persist({ ...data, comments: [entry, ...data.comments] });
    setComment({ ...comment, text: "" });
  }

  function addMember(event: FormEvent) {
    event.preventDefault();
    const name = memberName.trim();
    if (!name) return;
    const id = `user-${Date.now()}`;
    persist(
      {
        ...data,
        members: [
          ...data.members,
          { id, name, color: palette[data.members.length % palette.length] },
        ],
        savings: {
          ...data.savings,
          contributions: { ...data.savings.contributions, [id]: 0 },
        },
      },
      `${name} присоединяется к маршруту`,
    );
    setMemberName("");
  }

  function chooseGoalType(type: GoalType) {
    setGoalDraft(defaultDraft(type));
    setGeneratedPlan(null);
  }

  function openPlanner() {
    setGoalDraft(defaultDraft(data.goal.type));
    setPlannerStep("brief");
    setAgentProgress(0);
    setGeneratedPlan(null);
    setPlannerOpen(true);
    setMenuOpen(false);
  }

  async function runAgent(event: FormEvent) {
    event.preventDefault();
    if (!goalDraft.description.trim()) return;
    setPlannerStep("running");
    setAgentProgress(0);
    for (let index = 0; index < agentSteps.length; index += 1) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
      setAgentProgress(index + 1);
    }
    const result = generatePlan(goalDraft, data.members);
    setGeneratedPlan(result);
    setPlannerStep("preview");
  }

  function applyGeneratedPlan() {
    if (!generatedPlan) return;
    const contributions = Object.fromEntries(data.members.map((item) => [item.id, 0]));
    persist(
      {
        ...data,
        goal: generatedPlan.goal,
        stages: generatedPlan.stages,
        tasks: generatedPlan.tasks,
        agent: generatedPlan.agent,
        savings: {
          goal: generatedPlan.savingsGoal,
          contributions,
        },
      },
      `AI-маршрут готов: ${generatedPlan.tasks.length} задач`,
    );
    setTab(sharedOwner);
    setPlannerOpen(false);
    window.setTimeout(
      () => document.querySelector("#route")?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }

  function resetDemo() {
    if (!window.confirm("Сбросить маршрут, накопления и заметки к исходной версии?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setData(seed);
    setTab(sharedOwner);
    setToast("Демо возвращено к исходному состоянию");
    window.setTimeout(() => setToast(""), 2400);
    setMenuOpen(false);
  }

  const heroLead =
    data.goal.type === "relocation"
      ? "Из «когда-нибудь» —"
      : data.goal.type === "wedding"
        ? "Из идеи —"
        : "Из большой мечты —";
  const heroTarget =
    data.goal.type === "relocation"
      ? `в ${data.goal.target} вместе.`
      : data.goal.type === "wedding"
        ? "в день свадьбы вместе."
        : "в общий результат вместе.";

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top">
          <span>✦</span> Together Quest
        </a>
        <div className="top-stats">
          <span className="agent-online">
            <i /> AI-агент
          </span>
          <span className="xp">⚡ {totalPoints} XP</span>
          <span className="save-state">
            {saving ? "Сохраняю…" : "Сохранено в браузере ✓"}
          </span>
          <div className="menu-wrap">
            <button
              className="menu-button"
              aria-label="Открыть меню"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
            {menuOpen && (
              <nav className="menu-pop">
                <button onClick={openPlanner}>✦ Новый маршрут с AI</button>
                <button
                  onClick={() => {
                    setPeopleOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  👥 Участники
                </button>
                <button
                  onClick={() => {
                    setTaskOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  ＋ Добавить свой шаг
                </button>
                <a href="#notes" onClick={() => setMenuOpen(false)}>
                  💬 Заметки
                </a>
                <button onClick={resetDemo}>↺ Сбросить демо</button>
              </nav>
            )}
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">AI-АГЕНТ ДЛЯ СОВМЕСТНЫХ ЦЕЛЕЙ</p>
          <h1>
            {heroLead}
            <br />
            <em>{heroTarget}</em>
          </h1>
          <p>
            Опишите цель своими словами. Агент уточнит контекст, соберёт базовые
            задачи, выстроит зависимости и распределит шаги между участниками.
          </p>
          <span className="demo-badge">
            Интерактивный MVP · внешнему AI данные не передаются
          </span>
          <div className="hero-actions">
            <button className="primary ai-primary" onClick={openPlanner}>
              <span>✦</span> Составить маршрут с AI
            </button>
            <a href="#route" className="secondary">
              Посмотреть готовый план
            </a>
          </div>
        </div>
        <button className="mission-card agent-mission" onClick={() => setReportOpen(true)}>
          <div className="agent-orb">
            <span>AI</span>
            <i />
          </div>
          <span className="pill">ПЛАН СОБРАН АГЕНТОМ</span>
          <strong>{data.tasks.length} задач</strong>
          <div className="agent-mini-flow">
            <span className="complete">Цель</span>
            <i />
            <span className="complete">Контекст</span>
            <i />
            <span className="complete">План</span>
          </div>
          <div className="agent-progress-row">
            <span>{percentage}% выполнено</span>
            <b>
              {doneCount}/{data.tasks.length}
            </b>
          </div>
          <div className="progress agent-progress">
            <i style={{ width: `${percentage}%` }} />
          </div>
          <p>{data.stages.length} этапов · {participantsLabel(data.members.length)}</p>
          <span className="change-hint">Посмотреть работу агента →</span>
        </button>
      </section>

      <section className="agent-summary" aria-label="Как AI-агент создал план">
        <div className="agent-summary-head">
          <div>
            <span className="agent-kicker">✦ AI PLAN TRACE</span>
            <h2>От описания — к выполнимому маршруту</h2>
          </div>
          <button onClick={() => setReportOpen(true)}>Как это собрано</button>
        </div>
        <div className="agent-grid">
          <article>
            <span className="agent-number">01</span>
            <div>
              <small>ВХОД ПОЛЬЗОВАТЕЛЯ</small>
              <p>«{data.agent.input}»</p>
            </div>
          </article>
          <article>
            <span className="agent-number">02</span>
            <div>
              <small>АГЕНТ УЧЁЛ</small>
              <div className="context-chips">
                {data.agent.context.slice(0, 5).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </article>
          <article>
            <span className="agent-number">03</span>
            <div>
              <small>РЕЗУЛЬТАТ</small>
              <p>
                <b>{data.tasks.length} базовых задач</b>, зависимости, роли и
                контрольные точки
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard">
        <article className="piggy">
          <div className="card-head">
            <div>
              <span className="mini-label">ФОНД ОБЩЕЙ ЦЕЛИ</span>
              <h2>{savingTotal.toLocaleString("ru-RU")} ₽</h2>
            </div>
            <button
              className="round-button"
              aria-label="Пополнить копилку"
              onClick={() => setFundOpen(true)}
            >
              ＋
            </button>
          </div>
          <div className="saving-bar">
            <i style={{ width: `${savingPercent}%` }} />
          </div>
          <div className="saving-meta">
            <span>Цель: {data.savings.goal.toLocaleString("ru-RU")} ₽</span>
            <b>{savingPercent}%</b>
          </div>
          <div className="contributors">
            {data.members.map((item) => (
              <span key={item.id}>
                <i className="avatar" style={{ background: item.color }}>
                  {item.name[0]?.toUpperCase()}
                </i>
                {item.name}
                <b>{(data.savings.contributions[item.id] ?? 0).toLocaleString("ru-RU")} ₽</b>
              </span>
            ))}
          </div>
        </article>
        <article className="next-card">
          <span className="mini-label">СЛЕДУЮЩАЯ НАГРАДА</span>
          <div className="reward-row">
            <span className="reward">🎁</span>
            <div>
              <h3>Вечер без планирования</h3>
              <p>Откроется на 200 XP</p>
            </div>
            <b>{Math.min(totalPoints, 200)}/200</b>
          </div>
          <div className="progress pale">
            <i style={{ width: `${Math.min(100, totalPoints / 2)}%` }} />
          </div>
        </article>
      </section>

      <section className="route-section" id="route">
        <div className="section-title">
          <div>
            <p className="eyebrow">КАРТА, СОБРАННАЯ AI-АГЕНТОМ</p>
            <h2>Сегодня достаточно одного шага</h2>
          </div>
          <div className="section-tools">
            <div className="tabs">
              <button
                onClick={() => setTab(sharedOwner)}
                className={tab === sharedOwner ? "active" : ""}
              >
                Вместе
              </button>
              {data.members.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={tab === item.id ? "active" : ""}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <button className="regenerate" onClick={openPlanner}>
              ✦ Пересобрать
            </button>
          </div>
        </div>

        <div className="quest-list">
          {visibleStages.map((stage) => {
            const allDone = stage.tasks.length > 0 && stage.tasks.every((task) => task.done);
            const locked = stage.id > firstIncompleteStage;
            const stageDone = stage.tasks.filter((task) => task.done).length;
            return (
              <article
                className={`stage ${allDone ? "complete" : ""} ${locked ? "locked" : ""}`}
                key={stage.id}
              >
                <div className="stage-node">
                  <span>{allDone ? "✓" : locked ? "🔒" : stage.icon}</span>
                  <i />
                </div>
                <div className="stage-content">
                  <div className="stage-head">
                    <div>
                      <span className="stage-number">УРОВЕНЬ {stage.id}</span>
                      <h3>{stage.title}</h3>
                      <p>{stage.subtitle}</p>
                    </div>
                    <span className="counter">
                      {stageDone}/{stage.tasks.length}
                    </span>
                  </div>
                  <div className="tasks">
                    {stage.tasks.length === 0 && (
                      <p className="empty">Здесь пока нет личных задач.</p>
                    )}
                    {stage.tasks.map((item) => (
                      <button
                        className={`task ${item.done ? "done" : ""}`}
                        key={item.id}
                        onClick={() => !locked && toggleTask(item.id)}
                        disabled={locked}
                      >
                        <span className="check">{item.done ? "✓" : ""}</span>
                        <span className="task-copy">
                          <b>{item.title}</b>
                          <small>{item.note}</small>
                        </span>
                        <span className={`source-tag ${item.source}`}>
                          {item.source === "ai" ? "✦ AI" : "Ваш шаг"}
                        </span>
                        <span
                          className="owner"
                          style={{
                            background:
                              item.owner === sharedOwner
                                ? "#eef6ef"
                                : `${member(item.owner)?.color}20`,
                            color:
                              item.owner === sharedOwner
                                ? "#43765b"
                                : member(item.owner)?.color,
                          }}
                        >
                          {item.owner === sharedOwner
                            ? "Вместе"
                            : (member(item.owner)?.name ?? item.owner)}
                        </span>
                        <span className="points">+{item.points}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="notes-section" id="notes">
        <div className="notes-head">
          <div>
            <p className="eyebrow">НАША ЛЕНТА</p>
            <h2>Решения остаются за людьми</h2>
          </div>
          <span>💬 {data.comments.length}</span>
        </div>
        <p className="notes-intro">
          Обсуждайте предложения агента, фиксируйте договорённости и добавляйте свои шаги.
        </p>
        <form className="comment-form" onSubmit={addComment}>
          <select
            aria-label="Автор заметки"
            value={comment.author}
            onChange={(event) => setComment({ ...comment, author: event.target.value })}
          >
            {data.members.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={comment.text}
            onChange={(event) => setComment({ ...comment, text: event.target.value })}
            placeholder="Обсудить задачу, предложить изменение или поддержать…"
          />
          <button>Отправить</button>
        </form>
        <div className="comments">
          {data.comments.length === 0 ? (
            <div className="no-comments">
              Здесь появятся ваши решения и заметки. AI предлагает план — вы им управляете.
            </div>
          ) : (
            data.comments.map((item) => {
              const author = member(item.author);
              return (
                <article key={item.id}>
                  <i className="avatar" style={{ background: author?.color }}>
                    {author?.name[0]?.toUpperCase() ?? "?"}
                  </i>
                  <div>
                    <b>{author?.name ?? item.author}</b>
                    <span>{item.date}</span>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <footer>
        <span>{data.members.map((item) => item.name).join(" + ")}</span>
        <p>AI превращает описание в маршрут. Люди выбирают, что делать дальше.</p>
        <b>
          {data.goal.icon} {deadlineLabel(data.goal.deadline)}
        </b>
      </footer>

      {plannerOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPlannerOpen(false)}>
          <div
            className="modal planner-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Закрыть"
              onClick={() => setPlannerOpen(false)}
            >
              ×
            </button>

            {plannerStep === "brief" && (
              <form onSubmit={runAgent}>
                <div className="planner-heading">
                  <span className="agent-orb small">
                    <span>AI</span>
                    <i />
                  </span>
                  <div>
                    <span className="modal-kicker">НОВЫЙ МАРШРУТ</span>
                    <h2>Что вы хотите сделать вместе?</h2>
                    <p>
                      Сначала агент определит сценарий, затем задаст только подходящие
                      вопросы.
                    </p>
                  </div>
                </div>

                <div className="goal-types">
                  <button
                    type="button"
                    className={goalDraft.type === "relocation" ? "selected" : ""}
                    onClick={() => chooseGoalType("relocation")}
                  >
                    <span>✈️</span>
                    <b>Переезд</b>
                    <small>Страна, основание, срок</small>
                  </button>
                  <button
                    type="button"
                    className={goalDraft.type === "wedding" ? "selected" : ""}
                    onClick={() => chooseGoalType("wedding")}
                  >
                    <span>💍</span>
                    <b>Свадьба</b>
                    <small>Формат, гости, бюджет</small>
                  </button>
                  <button
                    type="button"
                    className={goalDraft.type === "custom" ? "selected" : ""}
                    onClick={() => chooseGoalType("custom")}
                  >
                    <span>🎯</span>
                    <b>Своя цель</b>
                    <small>Свободное описание</small>
                  </button>
                </div>

                <label className="planner-label">
                  Опишите цель своими словами
                  <textarea
                    autoFocus
                    value={goalDraft.description}
                    onChange={(event) =>
                      setGoalDraft({ ...goalDraft, description: event.target.value })
                    }
                    placeholder="Например: хотим переехать вдвоём…"
                    required
                  />
                  <small>Это основной вход для агента — не просто название задачи.</small>
                </label>

                {goalDraft.type === "relocation" && (
                  <div className="conditional-fields">
                    <div className="condition-title">
                      <span>✈️</span>
                      <div>
                        <b>Уточнения для переезда</b>
                        <small>Появились после выбора сценария</small>
                      </div>
                    </div>
                    <div className="field-grid">
                      <label>
                        Страна
                        <select
                          value={goalDraft.country}
                          onChange={(event) =>
                            setGoalDraft({ ...goalDraft, country: event.target.value })
                          }
                        >
                          {countryOptions.map((item) => (
                            <option key={item.country} value={item.country}>
                              {item.flag} {item.country}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Основной сценарий
                        <select
                          value={goalDraft.moveReason}
                          onChange={(event) =>
                            setGoalDraft({ ...goalDraft, moveReason: event.target.value })
                          }
                        >
                          <option>Учёба</option>
                          <option>Работа</option>
                          <option>Удалённая работа</option>
                          <option>Семья</option>
                          <option>Другое</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {goalDraft.type === "wedding" && (
                  <div className="conditional-fields">
                    <div className="condition-title">
                      <span>💍</span>
                      <div>
                        <b>Уточнения для свадьбы</b>
                        <small>Формат меняет задачи, бюджет и логику подготовки</small>
                      </div>
                    </div>
                    <div className="format-choice">
                      <button
                        type="button"
                        className={goalDraft.weddingFormat === "family" ? "selected" : ""}
                        onClick={() =>
                          setGoalDraft({
                            ...goalDraft,
                            weddingFormat: "family",
                            guestCount: "25",
                          })
                        }
                      >
                        <b>Семейная</b>
                        <small>Близкие, камерный формат</small>
                      </button>
                      <button
                        type="button"
                        className={goalDraft.weddingFormat === "large" ? "selected" : ""}
                        onClick={() =>
                          setGoalDraft({
                            ...goalDraft,
                            weddingFormat: "large",
                            guestCount: "100",
                          })
                        }
                      >
                        <b>Большая</b>
                        <small>Много гостей и подрядчиков</small>
                      </button>
                    </div>
                    <div className="field-grid">
                      <label>
                        Количество гостей
                        <input
                          type="number"
                          min="2"
                          max="1000"
                          value={goalDraft.guestCount}
                          onChange={(event) =>
                            setGoalDraft({ ...goalDraft, guestCount: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Город
                        <input
                          value={goalDraft.city}
                          onChange={(event) =>
                            setGoalDraft({ ...goalDraft, city: event.target.value })
                          }
                          placeholder="Например: Санкт-Петербург"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="field-grid common-fields">
                  <label>
                    Срок
                    <input
                      type="month"
                      value={goalDraft.deadline}
                      onChange={(event) =>
                        setGoalDraft({ ...goalDraft, deadline: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Общий бюджет, ₽
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={goalDraft.budget}
                      onChange={(event) =>
                        setGoalDraft({ ...goalDraft, budget: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="agent-privacy">
                  <span>🛡️</span>
                  <p>
                    <b>Демо работает локально.</b> Описание остаётся в браузере. В
                    продуктовой версии чувствительные данные будут исключаться до
                    обращения к модели.
                  </p>
                </div>

                <button className="modal-submit agent-submit">
                  <span>✦</span> Передать цель агенту
                </button>
              </form>
            )}

            {plannerStep === "running" && (
              <div className="agent-running">
                <div className="thinking-orb">
                  <span>AI</span>
                  <i />
                  <i />
                </div>
                <span className="modal-kicker">АГЕНТ СОБИРАЕТ МАРШРУТ</span>
                <h2>Превращаю описание в базовые задачи</h2>
                <p>Показываем действия агента, а не скрытые рассуждения модели.</p>
                <div className="agent-steps">
                  {agentSteps.map((step, index) => (
                    <div
                      className={`${index < agentProgress ? "done" : ""} ${
                        index === agentProgress ? "active" : ""
                      }`}
                      key={step.title}
                    >
                      <span>{index < agentProgress ? "✓" : index + 1}</span>
                      <div>
                        <b>{step.title}</b>
                        <small>{step.note}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plannerStep === "preview" && generatedPlan && (
              <div className="plan-preview">
                <div className="success-mark">✓</div>
                <span className="modal-kicker">МАРШРУТ ГОТОВ</span>
                <h2>{generatedPlan.goal.title}</h2>
                <p>
                  Агент создал {generatedPlan.tasks.length} базовых задач и разделил
                  их на {generatedPlan.stages.length} последовательных этапов.
                </p>

                <div className="preview-stats">
                  <span>
                    <small>СЦЕНАРИЙ</small>
                    <b>{generatedPlan.agent.intent}</b>
                  </span>
                  <span>
                    <small>СРОК</small>
                    <b>{deadlineLabel(generatedPlan.goal.deadline)}</b>
                  </span>
                  <span>
                    <small>УЧАСТНИКИ</small>
                    <b>{data.members.length}</b>
                  </span>
                </div>

                <div className="stage-preview">
                  {generatedPlan.stages.map((stage) => (
                    <span key={stage.id}>
                      <i>{stage.icon}</i>
                      <b>{stage.title}</b>
                      <small>
                        {
                          generatedPlan.tasks.filter((task) => task.stage === stage.id)
                            .length
                        }{" "}
                        задачи
                      </small>
                    </span>
                  ))}
                </div>

                <div className="task-preview">
                  <small>ПРИМЕРЫ СОЗДАННЫХ ЗАДАЧ</small>
                  {generatedPlan.tasks.slice(0, 4).map((item) => (
                    <div key={item.id}>
                      <span>✦ AI</span>
                      <p>
                        <b>{item.title}</b>
                        <small>{item.note}</small>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="preview-actions">
                  <button
                    className="back-button"
                    onClick={() => setPlannerStep("brief")}
                  >
                    ← Уточнить
                  </button>
                  <button className="modal-submit" onClick={applyGeneratedPlan}>
                    Применить маршрут →
                  </button>
                </div>
                <small className="replace-note">
                  Текущие задачи и цель копилки будут заменены. Участники и заметки
                  сохранятся.
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop" onMouseDown={() => setReportOpen(false)}>
          <div
            className="modal report-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Закрыть"
              onClick={() => setReportOpen(false)}
            >
              ×
            </button>
            <span className="modal-icon">✦</span>
            <span className="modal-kicker">ОТЧЁТ AI-АГЕНТА</span>
            <h2>Как появился этот маршрут</h2>
            <div className="report-input">
              <small>ИСХОДНОЕ ОПИСАНИЕ</small>
              <p>«{data.agent.input}»</p>
            </div>
            <div className="report-row">
              <small>РАСПОЗНАННЫЙ СЦЕНАРИЙ</small>
              <b>{data.agent.intent}</b>
            </div>
            <div className="report-row block">
              <small>УЧТЁННЫЙ КОНТЕКСТ</small>
              <div className="context-chips">
                {data.agent.context.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div className="report-result">
              <span>
                <b>{data.stages.length}</b>
                <small>этапов</small>
              </span>
              <span>
                <b>{data.tasks.length}</b>
                <small>задач</small>
              </span>
              <span>
                <b>{data.tasks.filter((item) => item.owner === sharedOwner).length}</b>
                <small>общих</small>
              </span>
            </div>
            <div className="guardrail">
              <b>Границы агента</b>
              {data.agent.assumptions.map((item) => (
                <p key={item}>✓ {item}</p>
              ))}
            </div>
            <button
              className="modal-submit"
              onClick={() => {
                setReportOpen(false);
                openPlanner();
              }}
            >
              Создать другой маршрут
            </button>
          </div>
        </div>
      )}

      {taskOpen && (
        <div className="modal-backdrop" onMouseDown={() => setTaskOpen(false)}>
          <form
            className="modal"
            onSubmit={addTask}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Закрыть"
              onClick={() => setTaskOpen(false)}
            >
              ×
            </button>
            <span className="modal-icon">＋</span>
            <h2>Добавить свой шаг</h2>
            <p>План агента остаётся редактируемым — решение всегда за вами.</p>
            <label>
              Для кого
              <select
                value={newTask.owner}
                onChange={(event) =>
                  setNewTask({ ...newTask, owner: event.target.value })
                }
              >
                {data.members.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
                <option value={sharedOwner}>Вместе</option>
              </select>
            </label>
            <label>
              Задача
              <input
                autoFocus
                value={newTask.title}
                onChange={(event) =>
                  setNewTask({ ...newTask, title: event.target.value })
                }
                placeholder="Например: уточнить условия у площадки"
              />
            </label>
            <label>
              Подсказка
              <input
                value={newTask.note}
                onChange={(event) =>
                  setNewTask({ ...newTask, note: event.target.value })
                }
                placeholder="Что именно нужно сделать?"
              />
            </label>
            <label>
              Этап
              <select
                value={newTask.stage}
                onChange={(event) =>
                  setNewTask({ ...newTask, stage: Number(event.target.value) })
                }
              >
                {data.stages.map((stage) => (
                  <option value={stage.id} key={stage.id}>
                    {stage.id}. {stage.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="modal-submit">Добавить шаг</button>
          </form>
        </div>
      )}

      {fundOpen && (
        <div className="modal-backdrop" onMouseDown={() => setFundOpen(false)}>
          <form
            className="modal fund-modal"
            onSubmit={addFunds}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Закрыть"
              onClick={() => setFundOpen(false)}
            >
              ×
            </button>
            <span className="modal-icon">🐷</span>
            <h2>Пополнить фонд цели</h2>
            <p>Любая сумма — ещё один шаг к общему результату.</p>
            <label>
              Кто добавляет
              <select
                value={fund.owner}
                onChange={(event) => setFund({ ...fund, owner: event.target.value })}
              >
                {data.members.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Сумма, ₽
              <input
                autoFocus
                type="number"
                min="1"
                value={fund.amount}
                onChange={(event) => setFund({ ...fund, amount: event.target.value })}
                placeholder="1000"
              />
            </label>
            <button className="modal-submit">Добавить в цель</button>
          </form>
        </div>
      )}

      {peopleOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPeopleOpen(false)}>
          <form
            className="modal"
            onSubmit={addMember}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Закрыть"
              onClick={() => setPeopleOpen(false)}
            >
              ×
            </button>
            <span className="modal-icon">👥</span>
            <h2>Участники</h2>
            <p>Агент учитывает состав команды при распределении новых задач.</p>
            <div className="member-list">
              {data.members.map((item) => (
                <div key={item.id}>
                  <i className="avatar" style={{ background: item.color }}>
                    {item.name[0]?.toUpperCase()}
                  </i>
                  <b>{item.name}</b>
                  <span>
                    {data.tasks
                      .filter((task) => task.owner === item.id && task.done)
                      .reduce((sum, task) => sum + task.points, 0)}{" "}
                    XP
                  </span>
                </div>
              ))}
            </div>
            <label>
              Имя нового участника
              <input
                autoFocus
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                placeholder="Например: Luna"
                maxLength={24}
              />
            </label>
            <button className="modal-submit">Добавить участника</button>
          </form>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
