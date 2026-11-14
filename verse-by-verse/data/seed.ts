// Starter content. Scripture is the World English Bible (public domain).
// Verses are stored in canonical order. Study notes are commentary, shown labelled as such.
import { type Bookmark, type Collections, type StudyNote, type Verse } from "./schema";

const ORDER: Record<string, number> = { Genesis: 1, Psalms: 19, Proverbs: 20, John: 43 };

// [book, chapter, verse, text]
const SCRIPTURE: Array<[string, number, number, string]> = [
  ["Genesis", 1, 1, "In the beginning, God created the heavens and the earth."],
  [
    "Genesis",
    1,
    2,
    "The earth was formless and empty. Darkness was on the surface of the deep and God's Spirit was hovering over the surface of the waters.",
  ],
  ["Genesis", 1, 3, "God said, \"Let there be light,\" and there was light."],
  [
    "Genesis",
    1,
    27,
    "God created man in his own image. In God's image he created him; male and female he created them.",
  ],
  [
    "Genesis",
    1,
    31,
    "God saw everything that he had made, and, behold, it was very good. There was evening and there was morning, a sixth day.",
  ],

  ["Psalms", 23, 1, "Yahweh is my shepherd; I shall lack nothing."],
  [
    "Psalms",
    23,
    2,
    "He makes me lie down in green pastures. He leads me beside still waters.",
  ],
  [
    "Psalms",
    23,
    3,
    "He restores my soul. He guides me in the paths of righteousness for his name's sake.",
  ],
  [
    "Psalms",
    23,
    4,
    "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.",
  ],
  [
    "Psalms",
    23,
    5,
    "You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over.",
  ],
  [
    "Psalms",
    23,
    6,
    "Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh's house forever.",
  ],

  ["Psalms", 46, 1, "God is our refuge and strength, a very present help in trouble."],
  [
    "Psalms",
    46,
    2,
    "Therefore we won't be afraid, though the earth changes, though the mountains are shaken into the heart of the seas;",
  ],
  [
    "Psalms",
    46,
    3,
    "though its waters roar and are troubled, though the mountains tremble with their swelling. Selah.",
  ],
  [
    "Psalms",
    46,
    4,
    "There is a river, the streams of which make the city of God glad, the holy place of the tents of the Most High.",
  ],
  [
    "Psalms",
    46,
    5,
    "God is within her. She shall not be moved. God will help her at dawn.",
  ],
  [
    "Psalms",
    46,
    6,
    "The nations raged. The kingdoms were moved. He lifted his voice and the earth melted.",
  ],
  ["Psalms", 46, 7, "Yahweh of Armies is with us. The God of Jacob is our refuge. Selah."],
  [
    "Psalms",
    46,
    8,
    "Come, see Yahweh's works, what desolations he has made on the earth.",
  ],
  [
    "Psalms",
    46,
    9,
    "He makes wars cease to the end of the earth. He breaks the bow, and shatters the spear. He burns the chariots in the fire.",
  ],
  [
    "Psalms",
    46,
    10,
    "\"Be still, and know that I am God. I will be exalted among the nations. I will be exalted on the earth.\"",
  ],
  ["Psalms", 46, 11, "Yahweh of Armies is with us. The God of Jacob is our refuge. Selah."],

  [
    "Psalms",
    119,
    105,
    "Your word is a lamp to my feet, and a light for my path.",
  ],

  [
    "Psalms",
    121,
    1,
    "I will lift up my eyes to the hills. Where does my help come from?",
  ],
  ["Psalms", 121, 2, "My help comes from Yahweh, who made heaven and earth."],
  [
    "Psalms",
    121,
    3,
    "He will not allow your foot to be moved. He who keeps you will not slumber.",
  ],
  ["Psalms", 121, 4, "Behold, he who keeps Israel will neither slumber nor sleep."],
  ["Psalms", 121, 5, "Yahweh is your keeper. Yahweh is your shade on your right hand."],
  ["Psalms", 121, 6, "The sun will not harm you by day, nor the moon by night."],
  ["Psalms", 121, 7, "Yahweh will keep you from all evil. He will keep your soul."],
  [
    "Psalms",
    121,
    8,
    "Yahweh will keep your going out and your coming in, from this time forward, and forever more.",
  ],

  [
    "Psalms",
    139,
    14,
    "I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.",
  ],

  [
    "Proverbs",
    1,
    7,
    "The fear of Yahweh is the beginning of knowledge, but the foolish despise wisdom and instruction.",
  ],
  [
    "Proverbs",
    3,
    5,
    "Trust in Yahweh with all your heart, and don't lean on your own understanding.",
  ],
  [
    "Proverbs",
    3,
    6,
    "In all your ways acknowledge him, and he will make your paths straight.",
  ],
  [
    "Proverbs",
    4,
    23,
    "Keep your heart with all diligence, for out of it is the wellspring of life.",
  ],
  ["Proverbs", 15, 1, "A gentle answer turns away wrath, but a harsh word stirs up anger."],
  [
    "Proverbs",
    16,
    3,
    "Commit your deeds to Yahweh, and your plans shall succeed.",
  ],
  ["Proverbs", 17, 17, "A friend loves at all times; and a brother is born for adversity."],
  [
    "Proverbs",
    22,
    1,
    "A good name is more desirable than great riches, and loving favor is better than silver and gold.",
  ],
  ["Proverbs", 27, 17, "Iron sharpens iron; so a man sharpens his friend's countenance."],

  [
    "John",
    1,
    1,
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
  ],
  ["John", 1, 5, "The light shines in the darkness, and the darkness hasn't overcome it."],
  [
    "John",
    1,
    14,
    "The Word became flesh and lived among us. We saw his glory, such glory as of the only born Son of the Father, full of grace and truth.",
  ],
  [
    "John",
    3,
    16,
    "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
  ],
  [
    "John",
    3,
    17,
    "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
  ],
  [
    "John",
    11,
    25,
    "Jesus said to her, \"I am the resurrection and the life. He who believes in me will still live, even if he dies.",
  ],
  [
    "John",
    14,
    6,
    "Jesus said to him, \"I am the way, the truth, and the life. No one comes to the Father, except through me.",
  ],
  [
    "John",
    14,
    27,
    "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful.",
  ],
  [
    "John",
    15,
    13,
    "Greater love has no one than this, that someone lay down his life for his friends.",
  ],
];

// [book, chapter, verse, title, commentary]. Commentary is shown labelled as commentary.
const NOTES: Array<[string, number, number, string, string]> = [
  [
    "Genesis",
    1,
    1,
    "The opening word",
    "Hebrew begins with bere'shit, \"in the beginning\". The verse works as a title for the whole story: God exists before everything and makes an ordered, good world.",
  ],
  [
    "Genesis",
    1,
    27,
    "Image and partnership",
    "The verse names humans as made in God's image, male and female together. Many readers take from this a calling to care for creation and for one another, not a ranking of people.",
  ],
  [
    "Psalms",
    23,
    1,
    "A shepherd's language",
    "Shepherd imagery was common across the ancient Near East for kings and gods. This psalm pictures God as the one who provides everything a sheep needs.",
  ],
  [
    "Psalms",
    23,
    4,
    "The valley",
    "The valley of the shadow of death is a deep, dark ravine. The psalm speaks of walking through it, not staying in it: the danger is real, and so is the presence.",
  ],
  [
    "Psalms",
    46,
    1,
    "Refuge and help",
    "A refuge is a place to run into, and a very present help is help close at hand. Psalms like this one were sung in worship, and their confidence rests on remembering past deliverance.",
  ],
  [
    "Psalms",
    46,
    10,
    "Be still",
    "The Hebrew verb can mean to let go or to stop striving. The verse calls for a pause, not passivity, before God's rule over the nations.",
  ],
  [
    "Psalms",
    119,
    105,
    "A lamp, not a floodlight",
    "An oil lamp lit only the next step on a dark road. The image is about guidance for the next decision, not a full map of the whole journey.",
  ],
  [
    "Psalms",
    121,
    1,
    "Lifting eyes",
    "Hills in the ancient world could hold shrines, and travellers faced danger on the roads through them. The psalm turns the question toward the Lord who made heaven and earth.",
  ],
  [
    "Psalms",
    139,
    14,
    "Fearfully and wonderfully",
    "The Hebrew sense is closer to \"awesomely made\". The psalm marvels at how a body is put together, and treats that wonder as a reason for thanks.",
  ],
  [
    "Proverbs",
    1,
    7,
    "Fear as a starting point",
    "In Proverbs, the fear of Yahweh means reverent trust that begins learning, not terror. It is set against fools who despise wisdom and instruction.",
  ],
  [
    "Proverbs",
    3,
    5,
    "Trust and understanding",
    "Proverbs does not dismiss thinking. It warns against making one's own understanding the final authority, and verse 6 pairs trust with acknowledging God in all of life.",
  ],
  [
    "Proverbs",
    16,
    3,
    "Committing plans",
    "The verb \"commit\" means to roll or hand over. Proverbs holds human planning and divine establishing together, rather than treating them as rivals.",
  ],
  [
    "Proverbs",
    17,
    17,
    "Loyal friendship",
    "Proverbs values friends who stay through hard times. The second line describes a brother as someone born for adversity, a reminder that family bonds are meant for hard days too.",
  ],
  [
    "John",
    1,
    1,
    "The Word",
    "John uses \"Word\" (logos) to speak of God's self-expression in creation and in Jesus. Opening with \"in the beginning\" echoes Genesis 1:1 on purpose.",
  ],
  [
    "John",
    1,
    14,
    "Dwelling among us",
    "\"Lived among us\" can be read as \"pitched a tent among us\". John presents the coming of Jesus as God's presence being seen, not only heard.",
  ],
  [
    "John",
    3,
    16,
    "The most-quoted verse",
    "Jesus speaks this to Nicodemus, a Pharisee who came to him at night. Many scholars read verses 16 to 21 as John's reflection on that conversation.",
  ],
  [
    "John",
    11,
    25,
    "Resurrection and life",
    "Jesus says this to Martha before raising Lazarus. The statement points to who Jesus is, and moves the conversation from a future hope to a present relationship.",
  ],
  [
    "John",
    14,
    6,
    "The way",
    "Spoken at the Last Supper in answer to Thomas. The \"I am\" sayings in John's Gospel identify Jesus with what God gives: life, light, and access to the Father.",
  ],
  [
    "John",
    15,
    13,
    "Friends",
    "Jesus speaks this to disciples shortly before his arrest. Friendship here is shown through self-giving love, and the next verse ties it to doing what he commands.",
  ],
  [
    "Proverbs",
    27,
    17,
    "Iron and iron",
    "Blades were sharpened by rubbing them against each other. The proverb describes honest conversation that makes a person sharper, which is both a challenge and an encouragement.",
  ],
];

const notedRefs = new Set(NOTES.map(([book, chapter, verse]) => `${book} ${chapter}:${verse}`));

const verses: Verse[] = SCRIPTURE.map(([book, chapter, verse, text], index) => ({
  id: `v${index + 1}`,
  book,
  bookOrder: ORDER[book] ?? 0,
  chapter,
  verse,
  text,
  hasNote: notedRefs.has(`${book} ${chapter}:${verse}`),
}));

const study_notes: StudyNote[] = NOTES.map(([book, chapter, verse, title, body], index) => ({
  id: `n${index + 1}`,
  book,
  chapter,
  verse,
  title,
  body,
}));

// A new install has saved nothing: the Saved tab starts empty and fills as the reader saves
// verses. (An earlier version shipped seven sample bookmarks with invented "saved" dates.)
const bookmarks: Bookmark[] = [];

export const seed = {
  verses,
  study_notes,
  bookmarks,
} satisfies Collections;
