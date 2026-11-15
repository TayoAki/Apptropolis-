// Starter content: the study notes. Scripture itself is the whole World English Bible, in
// data/bible/ (see data/bible.ts); it isn't copied into storage. Study notes are commentary,
// shown labelled as such, on the verse they name.
import { type Bookmark, type Collections, type StudyNote } from "./schema";

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
    "In Proverbs, the fear of the LORD means reverent trust that begins learning, not terror. It is set against fools who despise wisdom and instruction.",
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
  study_notes,
  bookmarks,
} satisfies Collections;
