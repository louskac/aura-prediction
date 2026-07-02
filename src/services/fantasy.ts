import { db, initDb } from "@/db/db";
import { fantasyPlayers, fantasySquads, fixtures as fixturesTable, markets as marketsTable } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { txline } from "./txline";
import axios from "axios";

// Helper for deterministic random generation using LCG (Linear Congruential Generator)
function seedRandom(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  let t = h ^ 0xdeadbeef;
  t = Math.imul(t ^ (t >>> 15), 15 | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | 4) ^ 0;
  let state = (t ^ (t >>> 14)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Deterministically pick an element from an array based on weights
function pickWeighted<T>(items: T[], weights: number[], rand: () => number): T {
  const sum = weights.reduce((a, b) => a + b, 0);
  let threshold = rand() * sum;
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Clean spelling variants for matching
export function normalizeTeamName(name: string): string {
  const n = name.trim().toLowerCase();
  if (n === "usa" || n === "united states") return "usa";
  if (n === "bosnia & herzegovina" || n === "bosnia and herzegovina") return "bosnia";
  if (n === "dr congo" || n === "congo dr" || n === "democratic republic of congo") return "dr congo";
  return n;
}

export interface PlayerStats {
  id: number;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  team: string;
  basePrice: number;
  currentPrice: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  previousPoints: number;
  currentPoints: number;
  fotmobId?: number | null;
}

export class FantasyService {
  constructor() {
    initDb();
  }

  // Resolve a player's FotMob ID using suggestion API
  public async resolveFotmobId(name: string): Promise<number | null> {
    try {
      // Clean name: e.g. "Ake, Nathan" -> "Nathan Ake"
      let searchName = name;
      if (name.includes(",")) {
        const parts = name.split(",");
        searchName = `${parts[1].trim()} ${parts[0].trim()}`;
      }
      
      const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(searchName)}&lang=en`;
      const res = await axios.get(url, { 
        timeout: 3000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const options = res.data.squadMemberSuggest?.[0]?.options || [];
      if (options.length > 0) {
        return Number(options[0].payload.id);
      }
    } catch (err: any) {
      console.warn(`[FotMob Suggest Failed] for ${name}: ${err.message}`);
    }
    return null;
  }

  // Safely backfill any missing player fotmob_ids in the background
  public async backfillFotmobIds() {
    initDb();
    const missing = db.select().from(fantasyPlayers).where(sql`fotmob_id IS NULL`).all() as unknown as PlayerStats[];
    if (missing.length === 0) return;
    
    console.log(`Backfilling FotMob IDs for ${missing.length} players...`);
    
    // Process in batches of 5 to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = missing.slice(i, i + batchSize);
      await Promise.all(batch.map(async (p) => {
        const fId = await this.resolveFotmobId(p.name);
        if (fId) {
          db.update(fantasyPlayers)
            .set({ fotmobId: fId })
            .where(eq(fantasyPlayers.id, p.id))
            .run();
        }
      }));
      await new Promise(r => setTimeout(r, 150));
    }
    console.log("FotMob ID backfill complete.");
  }

  // Seed the players database if it is empty
  public async seedPlayers() {
    initDb();
    const count = db.select({ count: sql`count(*)` }).from(fantasyPlayers).all()[0] as any;
    if (Number(count?.count ?? 0) > 0) {
      console.log("Fantasy players already seeded. Count:", count.count);
      return;
    }

    console.log("Seeding fantasy players database...");

    const squadsData: Record<string, { name: string; position: "GK" | "DEF" | "MID" | "FWD"; tier: "star" | "core" | "value" }[]> = {
      "Canada": [
        { name: "Alphonso Davies", position: "MID", tier: "star" },
        { name: "Jonathan David", position: "FWD", tier: "core" },
        { name: "Alistair Johnston", position: "DEF", tier: "value" },
        { name: "Milan Borjan", position: "GK", tier: "value" }
      ],
      "South Africa": [
        { name: "Percy Tau", position: "FWD", tier: "core" },
        { name: "Teboho Mokoena", position: "MID", tier: "core" },
        { name: "Mothobi Mvala", position: "DEF", tier: "value" },
        { name: "Ronwen Williams", position: "GK", tier: "core" }
      ],
      "Netherlands": [
        { name: "Cody Gakpo", position: "FWD", tier: "core" },
        { name: "Frenkie de Jong", position: "MID", tier: "star" },
        { name: "Virgil van Dijk", position: "DEF", tier: "star" },
        { name: "Bart Verbruggen", position: "GK", tier: "value" }
      ],
      "Morocco": [
        { name: "Youssef En-Nesyri", position: "FWD", tier: "core" },
        { name: "Hakim Ziyech", position: "MID", tier: "core" },
        { name: "Achraf Hakimi", position: "DEF", tier: "star" },
        { name: "Yassine Bounou", position: "GK", tier: "core" }
      ],
      "Germany": [
        { name: "Kai Havertz", position: "FWD", tier: "core" },
        { name: "Jamal Musiala", position: "MID", tier: "star" },
        { name: "Antonio Rüdiger", position: "DEF", tier: "star" },
        { name: "Manuel Neuer", position: "GK", tier: "core" }
      ],
      "Paraguay": [
        { name: "Julio Enciso", position: "FWD", tier: "core" },
        { name: "Miguel Almirón", position: "MID", tier: "core" },
        { name: "Gustavo Gómez", position: "DEF", tier: "value" },
        { name: "Roberto Fernández", position: "GK", tier: "value" }
      ],
      "France": [
        { name: "Kylian Mbappé", position: "FWD", tier: "star" },
        { name: "Antoine Griezmann", position: "MID", tier: "star" },
        { name: "William Saliba", position: "DEF", tier: "core" },
        { name: "Mike Maignan", position: "GK", tier: "core" }
      ],
      "Sweden": [
        { name: "Alexander Isak", position: "FWD", tier: "star" },
        { name: "Dejan Kulusevski", position: "MID", tier: "core" },
        { name: "Victor Lindelöf", position: "DEF", tier: "value" },
        { name: "Robin Olsen", position: "GK", tier: "value" }
      ],
      "Brazil": [
        { name: "Vinícius Júnior", position: "FWD", tier: "star" },
        { name: "Bruno Guimarães", position: "MID", tier: "core" },
        { name: "Marquinhos", position: "DEF", tier: "core" },
        { name: "Alisson Becker", position: "GK", tier: "star" }
      ],
      "Japan": [
        { name: "Ayase Ueda", position: "FWD", tier: "value" },
        { name: "Kaoru Mitoma", position: "MID", tier: "core" },
        { name: "Takehiro Tomiyasu", position: "DEF", tier: "core" },
        { name: "Zion Suzuki", position: "GK", tier: "value" }
      ],
      "Ivory Coast": [
        { name: "Sébastien Haller", position: "FWD", tier: "core" },
        { name: "Franck Kessié", position: "MID", tier: "core" },
        { name: "Evan Ndicka", position: "DEF", tier: "value" },
        { name: "Yahia Fofana", position: "GK", tier: "value" }
      ],
      "Norway": [
        { name: "Erling Haaland", position: "FWD", tier: "star" },
        { name: "Martin Ødegaard", position: "MID", tier: "star" },
        { name: "Leo Østigård", position: "DEF", tier: "value" },
        { name: "Ørjan Nyland", position: "GK", tier: "value" }
      ],
      "Mexico": [
        { name: "Santiago Giménez", position: "FWD", tier: "core" },
        { name: "Edson Álvarez", position: "MID", tier: "core" },
        { name: "César Montes", position: "DEF", tier: "value" },
        { name: "Luis Malagón", position: "GK", tier: "value" }
      ],
      "Ecuador": [
        { name: "Enner Valencia", position: "FWD", tier: "core" },
        { name: "Moisés Caicedo", position: "MID", tier: "core" },
        { name: "Piero Hincapié", position: "DEF", tier: "value" },
        { name: "Alexander Domínguez", position: "GK", tier: "value" }
      ],
      "England": [
        { name: "Harry Kane", position: "FWD", tier: "star" },
        { name: "Jude Bellingham", position: "MID", tier: "star" },
        { name: "John Stones", position: "DEF", tier: "core" },
        { name: "Jordan Pickford", position: "GK", tier: "core" }
      ],
      "DR Congo": [
        { name: "Yoane Wissa", position: "FWD", tier: "core" },
        { name: "Theo Bongonda", position: "MID", tier: "value" },
        { name: "Chancel Mbemba", position: "DEF", tier: "core" },
        { name: "Lionel Mpasi", position: "GK", tier: "value" }
      ],
      "Portugal": [
        { name: "Cristiano Ronaldo", position: "FWD", tier: "star" },
        { name: "Bruno Fernandes", position: "MID", tier: "star" },
        { name: "Rúben Dias", position: "DEF", tier: "core" },
        { name: "Diogo Costa", position: "GK", tier: "core" }
      ],
      "Croatia": [
        { name: "Andrej Kramarić", position: "FWD", tier: "value" },
        { name: "Luka Modrić", position: "MID", tier: "star" },
        { name: "Joško Gvardiol", position: "DEF", tier: "core" },
        { name: "Dominik Livaković", position: "GK", tier: "value" }
      ],
      "Spain": [
        { name: "Lamine Yamal", position: "FWD", tier: "star" },
        { name: "Rodri", position: "MID", tier: "star" },
        { name: "Dani Carvajal", position: "DEF", tier: "core" },
        { name: "Unai Simón", position: "GK", tier: "core" }
      ],
      "Austria": [
        { name: "Michael Gregoritsch", position: "FWD", tier: "value" },
        { name: "Marcel Sabitzer", position: "MID", tier: "core" },
        { name: "David Alaba", position: "DEF", tier: "core" },
        { name: "Alexander Schlager", position: "GK", tier: "value" }
      ],
      "United States": [
        { name: "Folarin Balogun", position: "FWD", tier: "core" },
        { name: "Christian Pulisic", position: "MID", tier: "star" },
        { name: "Antonee Robinson", position: "DEF", tier: "value" },
        { name: "Matt Turner", position: "GK", tier: "value" }
      ],
      "Bosnia and Herzegovina": [
        { name: "Ermedin Demirović", position: "FWD", tier: "core" },
        { name: "Rade Krunić", position: "MID", tier: "value" },
        { name: "Sead Kolašinac", position: "DEF", tier: "value" },
        { name: "Nikola Vasilj", position: "GK", tier: "value" }
      ],
      "Belgium": [
        { name: "Romelu Lukaku", position: "FWD", tier: "core" },
        { name: "Kevin De Bruyne", position: "MID", tier: "star" },
        { name: "Wout Faes", position: "DEF", tier: "value" },
        { name: "Koen Casteels", position: "GK", tier: "value" }
      ],
      "Senegal": [
        { name: "Nicolas Jackson", position: "FWD", tier: "core" },
        { name: "Sadio Mané", position: "MID", tier: "core" },
        { name: "Kalidou Koulibaly", position: "DEF", tier: "core" },
        { name: "Édouard Mendy", position: "GK", tier: "value" }
      ],
      "Argentina": [
        { name: "Lautaro Martínez", position: "FWD", tier: "star" },
        { name: "Lionel Messi", position: "MID", tier: "star" }, // Classified as MID here for tactical flex
        { name: "Cristian Romero", position: "DEF", tier: "core" },
        { name: "Emiliano Martínez", position: "GK", tier: "star" }
      ],
      "Cape Verde": [
        { name: "Bebé", position: "FWD", tier: "value" },
        { name: "Ryan Mendes", position: "MID", tier: "core" },
        { name: "Logan Costa", position: "DEF", tier: "value" },
        { name: "Vozinha", position: "GK", tier: "value" }
      ],
      "Australia": [
        { name: "Mitchell Duke", position: "FWD", tier: "value" },
        { name: "Jackson Irvine", position: "MID", tier: "core" },
        { name: "Harry Souttar", position: "DEF", tier: "value" },
        { name: "Mathew Ryan", position: "GK", tier: "value" }
      ],
      "Egypt": [
        { name: "Mostafa Mohamed", position: "FWD", tier: "core" },
        { name: "Mohamed Salah", position: "MID", tier: "star" },
        { name: "Mohamed Abdelmonem", position: "DEF", tier: "value" },
        { name: "Mohamed El Shenawy", position: "GK", tier: "value" }
      ],
      "Switzerland": [
        { name: "Breel Embolo", position: "FWD", tier: "core" },
        { name: "Granit Xhaka", position: "MID", tier: "star" },
        { name: "Manuel Akanji", position: "DEF", tier: "core" },
        { name: "Yann Sommer", position: "GK", tier: "core" }
      ],
      "Algeria": [
        { name: "Amine Gouiri", position: "FWD", tier: "core" },
        { name: "Riyad Mahrez", position: "MID", tier: "core" },
        { name: "Rayan Aït-Nouri", position: "DEF", tier: "value" },
        { name: "Anthony Mandrea", position: "GK", tier: "value" }
      ],
      "Colombia": [
        { name: "Luis Díaz", position: "FWD", tier: "star" },
        { name: "James Rodríguez", position: "MID", tier: "core" },
        { name: "Daniel Muñoz", position: "DEF", tier: "value" },
        { name: "Camilo Vargas", position: "GK", tier: "value" }
      ],
      "Ghana": [
        { name: "Antoine Semenyo", position: "FWD", tier: "core" },
        { name: "Mohammed Kudus", position: "MID", tier: "star" },
        { name: "Alexander Djiku", position: "DEF", tier: "value" },
        { name: "Lawrence Ati-Zigi", position: "GK", tier: "value" }
      ]
    };

    // Programmatic player list enricher to make sure there are multiple options for each position for all 32 teams.
    const extraPlayers: Record<string, { name: string; position: "GK" | "DEF" | "MID" | "FWD"; tier: "star" | "core" | "value" }[]> = {
      "Spain": [
        { name: "Ferran Torres", position: "FWD", tier: "core" },
        { name: "Álvaro Morata", position: "FWD", tier: "core" },
        { name: "Nico Williams", position: "FWD", tier: "star" },
        { name: "Pedri", position: "MID", tier: "star" },
        { name: "Dani Olmo", position: "MID", tier: "core" },
        { name: "Gavi", position: "MID", tier: "core" },
        { name: "Aymeric Laporte", position: "DEF", tier: "core" },
        { name: "Robin Le Normand", position: "DEF", tier: "value" },
        { name: "Marc Cucurella", position: "DEF", tier: "value" },
        { name: "David Raya", position: "GK", tier: "value" }
      ],
      "Portugal": [
        { name: "Rafael Leão", position: "FWD", tier: "star" },
        { name: "Diogo Jota", position: "FWD", tier: "core" },
        { name: "João Félix", position: "FWD", tier: "core" },
        { name: "Bernardo Silva", position: "MID", tier: "star" },
        { name: "Vitinha", position: "MID", tier: "core" },
        { name: "João Neves", position: "MID", tier: "value" },
        { name: "João Cancelo", position: "DEF", tier: "core" },
        { name: "Pepe", position: "DEF", tier: "core" },
        { name: "Nuno Mendes", position: "DEF", tier: "value" },
        { name: "Rui Patrício", position: "GK", tier: "value" }
      ],
      "Croatia": [
        { name: "Bruno Petković", position: "FWD", tier: "core" },
        { name: "Ante Budimir", position: "FWD", tier: "value" },
        { name: "Ivan Perišić", position: "FWD", tier: "core" },
        { name: "Mateo Kovačić", position: "MID", tier: "core" },
        { name: "Marcelo Brozović", position: "MID", tier: "core" },
        { name: "Mario Pašalić", position: "MID", tier: "value" },
        { name: "Josip Šutalo", position: "DEF", tier: "value" },
        { name: "Borna Sosa", position: "DEF", tier: "value" },
        { name: "Josip Stanišić", position: "DEF", tier: "value" },
        { name: "Nediljko Labrović", position: "GK", tier: "value" }
      ],
      "Switzerland": [
        { name: "Xherdan Shaqiri", position: "FWD", tier: "core" },
        { name: "Dan Ndoye", position: "FWD", tier: "value" },
        { name: "Ruben Vargas", position: "FWD", tier: "value" },
        { name: "Remo Freuler", position: "MID", tier: "core" },
        { name: "Denis Zakaria", position: "MID", tier: "core" },
        { name: "Michel Aebischer", position: "MID", tier: "value" },
        { name: "Ricardo Rodríguez", position: "DEF", tier: "value" },
        { name: "Fabian Schär", position: "DEF", tier: "core" },
        { name: "Silvan Widmer", position: "DEF", tier: "value" },
        { name: "Gregor Kobel", position: "GK", tier: "value" }
      ],
      "Algeria": [
        { name: "Baghdad Bounedjah", position: "FWD", tier: "core" },
        { name: "Islam Slimani", position: "FWD", tier: "value" },
        { name: "Said Benrahma", position: "FWD", tier: "core" },
        { name: "Ismaël Bennacer", position: "MID", tier: "star" },
        { name: "Houssem Aouar", position: "MID", tier: "core" },
        { name: "Nabil Bentaleb", position: "MID", tier: "value" },
        { name: "Aissa Mandi", position: "DEF", tier: "value" },
        { name: "Ramy Bensebaini", position: "DEF", tier: "core" },
        { name: "Youcef Atal", position: "DEF", tier: "value" },
        { name: "Alexandre Oukidja", position: "GK", tier: "value" }
      ],
      "Austria": [
        { name: "Marko Arnautović", position: "FWD", tier: "core" },
        { name: "Christoph Baumgartner", position: "FWD", tier: "core" },
        { name: "Patrick Wimmer", position: "FWD", tier: "value" },
        { name: "Konrad Laimer", position: "MID", tier: "core" },
        { name: "Florian Grillitsch", position: "MID", tier: "value" },
        { name: "Nicolas Seiwald", position: "MID", tier: "value" },
        { name: "Stefan Posch", position: "DEF", tier: "value" },
        { name: "Philipp Lienhart", position: "DEF", tier: "value" },
        { name: "Maximilian Wöber", position: "DEF", tier: "value" },
        { name: "Heinz Lindner", position: "GK", tier: "value" }
      ]
    };

    // Generic name pool generator for the other 26 teams so every team has plenty of options
    const genericNamePools: Record<string, { firstNames: string[]; lastNames: string[] }> = {
      "Canada": { firstNames: ["Cyle", "Tajon", "Liam", "Ismaël", "Kamal", "Sam", "Stephen", "Alistair"], lastNames: ["Larin", "Buchanan", "Millar", "Koné", "Miller", "Adekugbe", "Eustáquio", "Johnston"] },
      "South Africa": { firstNames: ["Evidence", "Zakhele", "Mihlali", "Sphephelo", "Aubrey", "Khuliso", "Grant", "Nyiko"], lastNames: ["Makgopa", "Lasa", "Mayambela", "Sithole", "Modiba", "Mudau", "Kekana", "Mobbie"] },
      "Netherlands": { firstNames: ["Memphis", "Donyell", "Xavi", "Tijjani", "Jerdy", "Nathan", "Lutsharel", "Jeremie"], lastNames: ["Depay", "Malen", "Simons", "Reijnders", "Schouten", "Aké", "Geertruida", "Frimpong"] },
      "Morocco": { firstNames: ["Sofiane", "Amine", "Sofyan", "Azzedine", "Selim", "Nayef", "Noussair", "Yahia"], lastNames: ["Boufal", "Adli", "Amrabat", "Ounahi", "Amallah", "Aguerd", "Mazraoui", "Attiyat Allah"] },
      "Germany": { firstNames: ["Niclas", "Leroy", "Florian", "Toni", "Robert", "Jonathan", "Maximilian", "David"], lastNames: ["Füllkrug", "Sané", "Wirtz", "Kroos", "Andrich", "Tah", "Mittelstädt", "Raum"] },
      "Paraguay": { firstNames: ["Adam", "Alex", "Andrés", "Richard", "Hernesto", "Omar", "Junior", "Iván"], lastNames: ["Bareiro", "Arce", "Cubas", "Sánchez", "Caballero", "Aldrete", "Alonso", "Ramírez"] },
      "France": { firstNames: ["Ousmane", "Marcus", "Olivier", "Eduardo", "Aurélien", "Dayot", "Lucas", "Benjamin"], lastNames: ["Dembélé", "Thuram", "Giroud", "Camavinga", "Tchouaméni", "Upamecano", "Hernandez", "Pavard"] },
      "Sweden": { firstNames: ["Viktor", "Gustaf", "Emil", "Jens", "Hugo", "Ludwig", "Emil", "Carl"], lastNames: ["Gyökeres", "Nilsson", "Forsberg", "Cajuste", "Larsson", "Augustinsson", "Krafth", "Starfelt"] },
      "Brazil": { firstNames: ["Rodrygo", "Gabriel", "Endrick", "Lucas", "Douglas", "João", "Bremer", "Danilo"], lastNames: ["Silva", "Martinelli", "Felipe", "Paquetá", "Luiz", "Gomes", "Beraldo", "Danilo"] },
      "Japan": { firstNames: ["Takumi", "Takefusa", "Wataru", "Daichi", "Ao", "Ko", "Yukinari", "Hiroki"], lastNames: ["Minamino", "Kubo", "Endo", "Kamada", "Tanaka", "Itakura", "Sugawara", "Ito"] },
      "Ivory Coast": { firstNames: ["Simon", "Christian", "Ibrahim", "Seko", "Serge", "Ousmane", "Willy", "Wilfried"], lastNames: ["Adingra", "Kouamé", "Sangaré", "Fofana", "Aurier", "Diomande", "Boly", "Singo"] },
      "Norway": { firstNames: ["Alexander", "Jørgen", "Sander", "Patrick", "Kristian", "Julian", "Marcus", "Andreas"], lastNames: ["Sørloth", "Larsen", "Berge", "Berg", "Thorstvedt", "Ryerson", "Pedersen", "Hanche-Olsen"] },
      "Mexico": { firstNames: ["Julián", "Uriel", "Luis", "Erick", "Orbelín", "Johan", "Jorge", "Gerardo"], lastNames: ["Quiñones", "Antuna", "Chávez", "Sánchez", "Pineda", "Vázquez", "Sánchez", "Arteaga"] },
      "Ecuador": { firstNames: ["Jordy", "Kevin", "Carlos", "Alan", "Joao", "Willian", "Félix", "José"], lastNames: ["Caicedo", "Rodriguez", "Gruezo", "Franco", "Ortiz", "Pacho", "Torres", "Hurtado"] },
      "England": { firstNames: ["Bukayo", "Phil", "Cole", "Declan", "Kobbie", "Kyle", "Kieran", "Marc"], lastNames: ["Saka", "Foden", "Palmer", "Rice", "Mainoo", "Walker", "Trippier", "Guéhi"] },
      "DR Congo": { firstNames: ["Cédric", "Fiston", "Samuel", "Charles", "Dylan", "Gédéon", "Rocky", "Arthur"], lastNames: ["Bakambu", "Mayele", "Moutoussamy", "Pickel", "Batubinsika", "Kalulu", "Bushiri", "Masuaku"] },
      "United States": { firstNames: ["Ricardo", "Timothy", "Weston", "Yunus", "Tyler", "Chris", "Sergiño", "Miles"], lastNames: ["Pepi", "Weah", "McKennie", "Musah", "Adams", "Richards", "Dest", "Robinson"] },
      "Bosnia and Herzegovina": { firstNames: ["Edin", "Smail", "Benjamin", "Anel", "Dennis", "Jusuf", "Eldar", "Adnan"], lastNames: ["Džeko", "Prevljak", "Tahirović", "Ahmedhodžić", "Hadžikadunić", "Gazibegović", "Civic", "Kovačević"] },
      "Belgium": { firstNames: ["Jérémy", "Leandro", "Youri", "Amadou", "Orel", "Timothy", "Jan", "Arthur"], lastNames: ["Doku", "Trossard", "Tielemans", "Onana", "Mangala", "Castagne", "Vertonghen", "Theate"] },
      "Senegal": { firstNames: ["Ismaïla", "Boulaye", "Idrissa", "Lamine", "Pape", "Abdou", "Fodé", "Formose"], lastNames: ["Sarr", "Dia", "Gueye", "Camara", "Gueye", "Diallo", "Ballo-Touré", "Mendy"] },
      "Argentina": { firstNames: ["Julián", "Angel", "Alexis", "Enzo", "Leandro", "Nicolás", "Nahuel", "Marcos"], lastNames: ["Álvarez", "Di María", "Mac Allister", "Fernández", "Paredes", "Otamendi", "Molina", "Acuña"] },
      "Cape Verde": { firstNames: ["Jovane", "Garry", "Jamiro", "Kenny", "Patrick", "Diney", "Steven", "Dylan"], lastNames: ["Cabral", "Rodrigues", "Monteiro", "Rocha", "Andrade", "Borges", "Moreira", "Tavares"] },
      "Australia": { firstNames: ["Martin", "Craig", "Connor", "Riley", "Keanu", "Kye", "Aziz", "Lewis"], lastNames: ["Boyle", "Goodwin", "Metcalfe", "McGree", "Baccus", "Rowles", "Behich", "Miller"] },
      "Egypt": { firstNames: ["Omar", "Mahmoud", "Mohamed", "Ahmed", "Hamdi", "Ahmed", "Yasser", "Mohamed"], lastNames: ["Marmoush", "Trezeguet", "Elneny", "Sayed", "Fathi", "Hegazi", "Ibrahim", "Hany"] },
      "Colombia": { firstNames: ["Rafael", "Jhon", "Jefferson", "Jhon", "Mateus", "Yerry", "Davinson", "Johan"], lastNames: ["Borré", "Durán", "Lerma", "Arias", "Uribe", "Mina", "Sánchez", "Mojica"] },
      "Ghana": { firstNames: ["Inaki", "Jordan", "Thomas", "Elisha", "Salis", "Mohammed", "Alidu", "Gideon"], lastNames: ["Williams", "Ayew", "Partey", "Ashimeru", "Abdul Samed", "Salisu", "Seidu", "Mensah"] }
    };

    // Merge extra players directly
    for (const [teamName, playersList] of Object.entries(extraPlayers)) {
      if (squadsData[teamName]) {
        squadsData[teamName].push(...playersList);
      }
    }

    // Generate generic players for the other teams
    for (const [teamName, pools] of Object.entries(genericNamePools)) {
      if (!squadsData[teamName]) continue;
      // Add FWDs
      squadsData[teamName].push(
        { name: `${pools.firstNames[0]} ${pools.lastNames[0]}`, position: "FWD", tier: "core" },
        { name: `${pools.firstNames[1]} ${pools.lastNames[1]}`, position: "FWD", tier: "value" }
      );
      // Add MIDs
      squadsData[teamName].push(
        { name: `${pools.firstNames[2]} ${pools.lastNames[2]}`, position: "MID", tier: "core" },
        { name: `${pools.firstNames[3]} ${pools.lastNames[3]}`, position: "MID", tier: "value" }
      );
      // Add DEFs
      squadsData[teamName].push(
        { name: `${pools.firstNames[4]} ${pools.lastNames[4]}`, position: "DEF", tier: "core" },
        { name: `${pools.firstNames[5]} ${pools.lastNames[5]}`, position: "DEF", tier: "value" }
      );
      // Add GK
      squadsData[teamName].push(
        { name: `${pools.firstNames[6]} ${pools.lastNames[6]}`, position: "GK", tier: "value" }
      );
    }

    // Calculate base price in millions: GK=5, DEF=6, MID=7, FWD=8 + tier bonus: star=5, core=2.5, value=0
    for (const [team, players] of Object.entries(squadsData)) {
      for (const p of players) {
        let base = 0;
        if (p.position === "GK") base = 50; // $5.0M
        else if (p.position === "DEF") base = 60; // $6.0M
        else if (p.position === "MID") base = 70; // $7.0M
        else base = 80; // $8.0M

        let tierBonus = 0;
        if (p.tier === "star") tierBonus = 50; // +$5.0M
        else if (p.tier === "core") tierBonus = 25; // +$2.5M

        const finalBasePrice = base + tierBonus;

        db.insert(fantasyPlayers).values({
          name: p.name,
          position: p.position,
          team: team,
          basePrice: finalBasePrice,
          currentPrice: finalBasePrice,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
          previousPoints: 0,
          currentPoints: 0,
          fotmobId: null
        }).run();

        // 3. Auto-seed player outcome prediction market
        const existingMarket = db.select().from(marketsTable).where(sql`type = 'player_performance' AND target_value = ${p.name}`).get();
        if (!existingMarket) {
          const activeFixtures = db.select().from(fixturesTable).all();
          const pFixture = activeFixtures.find(f => 
            normalizeTeamName(f.participant1) === normalizeTeamName(team) || 
            normalizeTeamName(f.participant2) === normalizeTeamName(team)
          );

          let initialYes = 50;
          if (p.tier === "star") initialYes = 75;
          else if (p.tier === "value") initialYes = 25;

          db.insert(marketsTable).values({
            name: `${p.name} to Score/Assist`,
            description: `Will ${p.name} (${team}) score at least 1 goal or make 1 assist in their next match?`,
            type: "player_performance",
            fixtureId: pFixture ? pFixture.fixtureId : null,
            targetValue: p.name,
            yesPrice: initialYes,
            noPrice: 100 - initialYes,
            status: "Active",
            createdAt: Date.now()
          }).run();
        }
      }
    }

    await this.calculatePrices();
    console.log("Successfully seeded fantasy players database!");
  }

  // Calculate dynamic player prices
  public async calculatePrices() {
    initDb();
    const players = db.select().from(fantasyPlayers).all() as unknown as PlayerStats[];
    const activeMarkets = db.select().from(marketsTable).all();

    for (const player of players) {
      // 1. Check player performance contract price
      const playerMarket = activeMarkets.find(m => 
        m.type === "player_performance" && 
        m.targetValue === player.name
      );

      if (playerMarket) {
        let newPrice = Math.round(playerMarket.yesPrice * 1.5);
        // Enforce logical bounds ($1.5M min, $15.0M max)
        if (newPrice < 15) newPrice = 15;
        if (newPrice > 150) newPrice = 150;

        db.update(fantasyPlayers)
          .set({ currentPrice: newPrice })
          .where(eq(fantasyPlayers.id, player.id))
          .run();
        continue;
      }

      // Fallback old team-based calculation
      let momentum = 0;
      const teamMarket = activeMarkets.find(m => 
        m.type === "bracket_knockout" && 
        normalizeTeamName(m.targetValue || "") === normalizeTeamName(player.team)
      );

      if (teamMarket) {
        if (teamMarket.yesPrice > 60) {
          momentum += 5;
        } else if (teamMarket.yesPrice < 40) {
          momentum -= 5;
        }
      }

      const performancePointsBonus = player.currentPoints * 2;
      let newPrice = Math.round((player.basePrice + performancePointsBonus) * (1 + momentum / 100));
      if (newPrice < 30) newPrice = 30;

      db.update(fantasyPlayers)
        .set({ currentPrice: newPrice })
        .where(eq(fantasyPlayers.id, player.id))
        .run();
    }
  }

  // Deterministic point validation & sync from TxLINE score events
  public async syncPoints() {
    initDb();
    await this.seedPlayers();
    this.backfillFotmobIds().catch(err => console.error("Error backfilling fotmob IDs:", err));

    // 1. Fetch fixtures from database
    const fixtures = db.select().from(fixturesTable).all();
    
    // Reset points/stats for full re-calculation to avoid double-counting on syncs
    db.update(fantasyPlayers).set({
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      currentPoints: 0
    }).run();

    console.log(`Syncing fantasy points for ${fixtures.length} fixtures in db...`);

    for (const f of fixtures) {
      // We only process InPlay or Finished matches
      if (f.status === "NotStarted") continue;

      let stats: Record<string, number> = {};
      
      try {
        // Query scores snapshot history from TxLINE API
        const scores = await txline.getScores(f.fixtureId);
        if (scores && scores.length > 0) {
          // Get the latest score event
          const sorted = [...scores].sort((a: any, b: any) => (a.Seq ?? 0) - (b.Seq ?? 0));
          const last = sorted[sorted.length - 1];
          stats = last.Stats || {};
        }
      } catch (e: any) {
        console.error(`Could not fetch live scores for ${f.fixtureId}:`, e.message);
      }

      // Fallback stats from database if api returned empty/offline
      if (Object.keys(stats).length === 0) {
        stats["1"] = f.score1 ?? 0;
        stats["2"] = f.score2 ?? 0;
        stats["3"] = 0; // Default cards
        stats["4"] = 0;
        stats["5"] = 0;
        stats["6"] = 0;
        stats["7"] = 5; // Default Corners
        stats["8"] = 4;
      }

      const team1Goals = Number(stats["1"] ?? 0);
      const team2Goals = Number(stats["2"] ?? 0);
      const team1Yellow = Number(stats["3"] ?? 0);
      const team2Yellow = Number(stats["4"] ?? 0);
      const team1Red = Number(stats["5"] ?? 0);
      const team2Red = Number(stats["6"] ?? 0);
      const team1Corners = Number(stats["7"] ?? 0);
      const team2Corners = Number(stats["8"] ?? 0);

      // Fetch players for both teams
      const p1Players = db.select().from(fantasyPlayers).where(eq(fantasyPlayers.team, f.participant1)).all() as unknown as PlayerStats[];
      const p2Players = db.select().from(fantasyPlayers).where(eq(fantasyPlayers.team, f.participant2)).all() as unknown as PlayerStats[];

      const fId = f.fixtureId;

      // Deterministic Event Attribution for Team 1
      this.attributeTeamEvents(fId, f.participant1, p1Players, team1Goals, team1Yellow, team1Red, team1Corners, team2Goals, team1Goals > team2Goals, f.status === "Finished");

      // Deterministic Event Attribution for Team 2
      this.attributeTeamEvents(fId, f.participant2, p2Players, team2Goals, team2Yellow, team2Red, team2Corners, team1Goals, team2Goals > team1Goals, f.status === "Finished");
    }

    // After re-calculating points, run the pricing engine updates!
    await this.calculatePrices();
  }

  // Deterministically attribute statistics to team roster
  private attributeTeamEvents(
    fixtureId: number,
    teamName: string,
    players: PlayerStats[],
    goals: number,
    yellows: number,
    reds: number,
    corners: number,
    conceded: number,
    isWinner: boolean,
    isFinished: boolean
  ) {
    if (players.length === 0) return;

    // Filter roster by position
    const gks = players.filter(p => p.position === "GK");
    const defs = players.filter(p => p.position === "DEF");
    const mids = players.filter(p => p.position === "MID");
    const fwds = players.filter(p => p.position === "FWD");

    // Accumulated stats per player
    const pGoals: Record<number, number> = {};
    const pAssists: Record<number, number> = {};
    const pYellows: Record<number, number> = {};
    const pReds: Record<number, number> = {};

    players.forEach(p => {
      pGoals[p.id] = 0;
      pAssists[p.id] = 0;
      pYellows[p.id] = 0;
      pReds[p.id] = 0;
    });

    // 1. Attribute Goals
    for (let g = 0; g < goals; g++) {
      const seed = `${fixtureId}-${teamName}-goal-${g}`;
      const rand = seedRandom(seed);
      // FWD: 50%, MID: 30%, DEF: 18%, GK: 2%
      const candidateList: PlayerStats[] = [];
      const weights: number[] = [];

      if (fwds.length > 0) { fwds.forEach(p => { candidateList.push(p); weights.push(50 / fwds.length); }); }
      if (mids.length > 0) { mids.forEach(p => { candidateList.push(p); weights.push(30 / mids.length); }); }
      if (defs.length > 0) { defs.forEach(p => { candidateList.push(p); weights.push(18 / defs.length); }); }
      if (gks.length > 0) { gks.forEach(p => { candidateList.push(p); weights.push(2 / gks.length); }); }

      if (candidateList.length > 0) {
        const scorer = pickWeighted(candidateList, weights, rand);
        pGoals[scorer.id]++;

        // 70% chance of Assist
        const assistRand = seedRandom(`${fixtureId}-${teamName}-assist-${g}`);
        if (assistRand() < 0.7) {
          const assistCandidates = candidateList.filter(p => p.id !== scorer.id);
          const assistWeights: number[] = [];
          
          const aFwds = assistCandidates.filter(p => p.position === "FWD");
          const aMids = assistCandidates.filter(p => p.position === "MID");
          const aDefs = assistCandidates.filter(p => p.position === "DEF");
          
          if (aMids.length > 0) { aMids.forEach(p => { assistCandidates.push(p); assistWeights.push(50 / aMids.length); }); }
          if (aDefs.length > 0) { aDefs.forEach(p => { assistCandidates.push(p); assistWeights.push(30 / aDefs.length); }); }
          if (aFwds.length > 0) { aFwds.forEach(p => { assistCandidates.push(p); assistWeights.push(20 / aFwds.length); }); }

          if (assistCandidates.length > 0) {
            const assister = pickWeighted(assistCandidates, assistWeights, assistRand);
            pAssists[assister.id]++;
          }
        }
      }
    }

    // 2. Attribute Yellow Cards
    for (let y = 0; y < yellows; y++) {
      const seed = `${fixtureId}-${teamName}-yellow-${y}`;
      const rand = seedRandom(seed);
      // DEF: 50%, MID: 35%, FWD: 15%
      const candidateList: PlayerStats[] = [];
      const weights: number[] = [];

      if (defs.length > 0) { defs.forEach(p => { candidateList.push(p); weights.push(50 / defs.length); }); }
      if (mids.length > 0) { mids.forEach(p => { candidateList.push(p); weights.push(35 / mids.length); }); }
      if (fwds.length > 0) { fwds.forEach(p => { candidateList.push(p); weights.push(15 / fwds.length); }); }

      if (candidateList.length > 0) {
        const carder = pickWeighted(candidateList, weights, rand);
        pYellows[carder.id]++;
      }
    }

    // 3. Attribute Red Cards
    for (let r = 0; r < reds; r++) {
      const seed = `${fixtureId}-${teamName}-red-${r}`;
      const rand = seedRandom(seed);
      // DEF: 60%, MID: 30%, FWD: 10%
      const candidateList: PlayerStats[] = [];
      const weights: number[] = [];

      if (defs.length > 0) { defs.forEach(p => { candidateList.push(p); weights.push(60 / defs.length); }); }
      if (mids.length > 0) { mids.forEach(p => { candidateList.push(p); weights.push(30 / mids.length); }); }
      if (fwds.length > 0) { fwds.forEach(p => { candidateList.push(p); weights.push(10 / fwds.length); }); }

      if (candidateList.length > 0) {
        const carder = pickWeighted(candidateList, weights, rand);
        pReds[carder.id]++;
      }
    }

    // 4. Calculate Points & Update Database
    for (const player of players) {
      let pts = 0;
      
      // Base points for playing
      pts += 2; 

      // Goal points
      const g = pGoals[player.id];
      if (player.position === "GK") pts += g * 10;
      else if (player.position === "DEF") pts += g * 6;
      else if (player.position === "MID") pts += g * 5;
      else pts += g * 4;

      // Assist points
      pts += pAssists[player.id] * 3;

      // Clean sheet
      const hasCleanSheet = conceded === 0;
      if (hasCleanSheet) {
        if (player.position === "GK" || player.position === "DEF") pts += 4;
        else if (player.position === "MID") pts += 1;
      }

      // Conceded drag
      if (player.position === "GK" || player.position === "DEF") {
        pts -= Math.floor(conceded / 2);
      }

      // Corners contribution
      if (player.position === "DEF" || player.position === "MID") {
        pts += corners * 0.5; // +0.5 per corner won
      }

      // Cards drag
      pts -= pYellows[player.id] * 1;
      pts -= pReds[player.id] * 3;

      // Match Win bonus
      if (isWinner && isFinished) {
        pts += 2;
      }

      // Round to nearest integer for clean display
      const finalPoints = Math.round(pts);

      db.update(fantasyPlayers)
        .set({
          goals: g,
          assists: pAssists[player.id],
          cleanSheets: hasCleanSheet ? 1 : 0,
          yellowCards: pYellows[player.id],
          redCards: pReds[player.id],
          currentPoints: finalPoints
        })
        .where(eq(fantasyPlayers.id, player.id))
        .run();
    }
  }

  // Get user's squad
  public getSquad(walletAddress: string) {
    initDb();
    const squad = db.select().from(fantasySquads).where(eq(fantasySquads.walletAddress, walletAddress)).all()[0];
    if (!squad) return null;

    const ids = JSON.parse(squad.playerIds) as number[];
    if (ids.length === 0) return null;

    // Fetch players detail
    const playersList = db.select().from(fantasyPlayers).all() as unknown as PlayerStats[];
    const selectedPlayers = playersList.filter(p => ids.includes(p.id));

    // Sum points
    const pointsSum = selectedPlayers.reduce((a, b) => a + b.currentPoints, 0);

    // Fetch prediction markets for the drafted players
    const activeMarkets = db.select().from(marketsTable).all();
    let successfulContracts = 0;
    const resolvedPlayers = selectedPlayers.map(p => {
      const pMarket = activeMarkets.find(m => m.type === "player_performance" && m.targetValue === p.name);
      let contractStatus: "Active" | "ResolvedYes" | "ResolvedNo" = "Active";
      let resolvedValue = 0;

      const playerFixture = db.select().from(fixturesTable).all().find(f => 
        normalizeTeamName(f.participant1) === normalizeTeamName(p.team) || 
        normalizeTeamName(f.participant2) === normalizeTeamName(p.team)
      );

      if (playerFixture && playerFixture.status === "Finished") {
        const achieved = p.goals > 0 || p.assists > 0;
        contractStatus = achieved ? "ResolvedYes" : "ResolvedNo";
        resolvedValue = achieved ? 100 : 0;
        if (achieved) successfulContracts++;
      } else {
        resolvedValue = pMarket ? pMarket.yesPrice : 50;
      }

      return {
        ...p,
        contractStatus,
        resolvedValue,
        marketId: pMarket?.id || null
      };
    });

    const isFullSquadResolved = resolvedPlayers.length > 0 && resolvedPlayers.every(p => p.contractStatus !== "Active");
    const totalCollateral = 0.05;
    const estimatedPayout = resolvedPlayers.reduce((sum, p) => sum + (p.resolvedValue / 100) * 0.009, 0);
    const yieldRate = ((estimatedPayout - totalCollateral) / totalCollateral) * 100;

    return {
      walletAddress: squad.walletAddress,
      playerIds: ids,
      players: resolvedPlayers,
      budgetRemaining: squad.budgetRemaining,
      totalPoints: pointsSum,
      formation: squad.formation || "4-3-3",
      playDay: squad.playDay || "2026-06-29",
      createdAt: squad.createdAt,
      totalCollateral,
      estimatedPayout,
      yieldRate,
      isResolved: isFullSquadResolved
    };
  }

  // Save/Update user squad (and validate constraints)
  public saveSquad(walletAddress: string, playerIds: number[], formation: string = "4-3-3", playDay: string = "2026-06-29") {
    initDb();

    // 1. Check constraints
    if (playerIds.length !== 11) {
      throw new Error(`Line-up must contain exactly 11 players. Found ${playerIds.length}.`);
    }

    // Check duplicates
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== 11) {
      throw new Error("Squad cannot contain duplicate players.");
    }

    // Fetch details of selected players
    const allPlayers = db.select().from(fantasyPlayers).all() as unknown as PlayerStats[];
    const squadPlayers = allPlayers.filter(p => uniqueIds.has(p.id));

    if (squadPlayers.length !== 11) {
      throw new Error("One or more selected players were not found in the roster database.");
    }

    // Dynamic budget calculation based on number of active matches for this playDay
    const activeFixtures = db.select().from(fixturesTable).all();
    const playDayFixtures = activeFixtures.filter(f => {
      const dateStr = new Date(f.startTime - 6 * 3600 * 1000).toISOString().split("T")[0];
      return dateStr === playDay;
    });

    // Validate that all selected players are from teams playing on the active playDay
    const normalizeTeamName = (name: string): string => {
      const lowercase = name.toLowerCase().trim();
      if (lowercase === "usa" || lowercase === "united states") return "usa";
      if (lowercase.includes("bosnia")) return "bosnia";
      if (lowercase.includes("congo") || lowercase.includes("dr congo")) return "congo";
      return lowercase;
    };

    const allowedNormalizedTeams = new Set(
      playDayFixtures.flatMap(f => [normalizeTeamName(f.participant1), normalizeTeamName(f.participant2)])
    );

    for (const p of squadPlayers) {
      if (!allowedNormalizedTeams.has(normalizeTeamName(p.team))) {
        throw new Error(`Player ${p.name} cannot be drafted because their team (${p.team}) is not playing on this play day (${playDay}).`);
      }
    }

    const matchesCount = playDayFixtures.length || 1;
    // Scale budget: $70.0M base + $4.0M per match, capped between $75.0M and $100.0M (750 to 1000 credits)
    const computedMaxBudget = Math.min(1000, Math.max(750, 700 + matchesCount * 40));

    const totalCost = squadPlayers.reduce((sum, p) => sum + p.currentPrice, 0);

    if (totalCost > computedMaxBudget) {
      throw new Error(`Squad exceeds dynamic budget cap of $${(computedMaxBudget / 10).toFixed(1)}M for this play day. Total spent: $${(totalCost / 10).toFixed(1)}M.`);
    }

    // Formation checks: must contain exactly 1 Goalkeeper (GK)
    const gks = squadPlayers.filter(p => p.position === "GK");
    if (gks.length !== 1) {
      throw new Error(`Roster must have exactly 1 Goalkeeper. Found ${gks.length}.`);
    }

    const budgetRemaining = computedMaxBudget - totalCost;
    const pointsSum = squadPlayers.reduce((a, b) => a + b.currentPoints, 0);

    const values = {
      walletAddress,
      playerIds: JSON.stringify(playerIds),
      budgetRemaining,
      totalPoints: pointsSum,
      formation,
      playDay,
      createdAt: Date.now()
    };

    // Upsert squad
    const existing = db.select().from(fantasySquads).where(eq(fantasySquads.walletAddress, walletAddress)).all();
    if (existing.length > 0) {
      db.update(fantasySquads)
        .set({
          playerIds: values.playerIds,
          budgetRemaining: values.budgetRemaining,
          totalPoints: values.totalPoints,
          formation: values.formation,
          playDay: values.playDay
        })
        .where(eq(fantasySquads.walletAddress, walletAddress))
        .run();
    } else {
      db.insert(fantasySquads).values(values).run();
    }

    return { success: true, budgetRemaining, totalPoints: pointsSum, formation, playDay };
  }
}

export const fantasyService = new FantasyService();
