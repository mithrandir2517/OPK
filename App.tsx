import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar as NativeStatusBar,
} from 'react-native';

type ActivityKey = 'obed' | 'pivo' | 'kolo';
type SectionKey = ActivityKey | 'kronika' | 'zpravy' | 'profil' | 'party';
type LunchRestaurant = {
  name: string;
  delivery: boolean;
  message?: string;
  items: Array<{
    no?: string;
    name: string;
    price?: string;
  }>;
};

const activityMeta: Record<ActivityKey, { title: string; accent: string; action: string }> = {
  obed: { title: 'Oběd', accent: '#0F766E', action: 'Dáme oběd?' },
  pivo: { title: 'Pivo', accent: '#B45309', action: 'Jedu tam' },
  kolo: { title: 'Kolo', accent: '#2563EB', action: 'Dáme kolo?' },
};

const navItems: Array<{ key: ActivityKey; label: string; mark: string }> = [
  { key: 'obed', label: 'Oběd', mark: 'O' },
  { key: 'pivo', label: 'Pivo', mark: 'P' },
  { key: 'kolo', label: 'Kolo', mark: 'K' },
];

const lunchRestaurants: LunchRestaurant[] = [
  {
    name: 'Radegastovna Pirát',
    delivery: true,
    items: [
      { name: '0,33l Moravská cibulačka s trhaným uzeným masem, bramborem a chlebovými krutony', price: '85 Kč' },
      { no: '1.', name: '350g Tortilla Caesar s grilovaným kuřecím masem, pancettou, římským salátem, sýrem Grand Biraghi, rajčaty a Caesar dressingem, hranolky, dip dle výběru', price: '295 Kč' },
      { no: '2.', name: '200g Grilovaná vepřová panenka plněná anglickou slaninou, smetanová omáčka se sýrem Pecorino, smažené krokety, čerstvý baby špenát', price: '295 Kč' },
      { no: '3.', name: '250g Telecí rumpsteak', price: '339 Kč' },
    ],
  },
  {
    name: 'Adélka',
    delivery: false,
    items: [
      { name: 'Dršťková polévka s petrželkou', price: '65 Kč' },
      { name: 'Kuřecí vývar, maso, zelenina, nudle', price: '65 Kč' },
      { no: '1.', name: 'Kančí výpečky na černém pivu a česneku, dušená kapusta, restované bramborové šišky s petrželkou', price: '219 Kč' },
      { no: '2.', name: 'Steak z tuňáka v sezamové marinádě, zeleninový salát s citrusovými segmenty, mikrobylinky', price: '295 Kč' },
      { no: '3.', name: 'Bún Chả, grilovaný marinovaný asijský vepřový bůček, restované rýžové nudle s julienne zeleninou, koriandr, sezam, smažená cibulka', price: '259 Kč' },
      { no: '4.', name: 'Wagyu rump steak, pepřová nebo houbová omáčka, pečené brambory s bylinkami, listový salát', price: '499 Kč' },
      { no: '5.', name: 'Citronový koláč s jahodami', price: '75 Kč' },
    ],
  },
  {
    name: 'U Maxíka',
    delivery: true,
    items: [{ name: 'Dle denní nabídky' }],
  },
  { name: 'Restaurace Sport Drnovice', delivery: false, items: [{ no: '1.', name: 'Víkendové menu' }] },
  { name: 'Hotel Allvet', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Chalupa U Městské brány', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Pohoda Luleč', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Cafe Moya', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Finestra Restaurant', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Resto Rugby', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Hospůdka U Nádraží', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Kojál', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Bowling Pub', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Gastrocentrum', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Cafe & You', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Restaurace Sokolovna', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Restaurace Kuchyňa', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Campos Catering', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  {
    name: 'Restaurace na Městečku',
    delivery: true,
    items: [
      { name: 'Hovězí vývar s nudlemi', price: '' },
      { no: '1.', name: '150g Pečené králičí stehno na smetaně, domácí houskový knedlík', price: '209 Kč' },
      { no: '2.', name: '150g Vepřový stroganoff, hranolky', price: '189 Kč' },
    ],
  },
  {
    name: 'Restaurace Letiště u Kopinců',
    delivery: false,
    items: [
      { name: 'Hovězí vývar' },
      { no: '1.', name: 'Moravský vrabec, zelí, knedlík', price: '189 Kč' },
      { no: '2.', name: 'Kuřecí kung-pao, jasmínová rýže', price: '189 Kč' },
      { no: '3.', name: 'Smažený kuřecí řízek, bramborový salát', price: '219 Kč' },
      { no: '4.', name: 'Katův šleh, domácí bramboráčky', price: '219 Kč' },
      { no: '5.', name: 'Panenka s houbovou omáčkou, bramborové dolárky', price: '239 Kč' },
      { no: '6.', name: 'Panenka na grilu, bramborové dolárky, tatarka', price: '239 Kč' },
      { no: '7.', name: 'Smažený sýr, hranolky, tatarka', price: '199 Kč' },
      { no: '8.', name: 'Dětský smažený sýr, hranolky, kečup', price: '139 Kč' },
      { no: '9.', name: 'Dětský smažený kuřecí řízeček, hranolky, kečup', price: '139 Kč' },
    ],
  },
  {
    name: 'Hotel Dukla',
    delivery: false,
    items: [
      { name: 'Domácí vývar s masem a nudlemi' },
      { no: '1.', name: '150g Pljeskavica, hranolky, ajvar', price: '184 Kč' },
      { no: '2.', name: '200g Marinovaná krkovička na grilu, šťouchané brambory, zelný salát s koprem', price: '210 Kč' },
      { no: '3.', name: '200g Smažený vepřový řízek, vařené brambory, sterilovaný okurek', price: '185 Kč' },
    ],
  },
  { name: 'zeměznás', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Hotel Selský dvůr', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'BERNARD BAR Sedmička', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Statek Olšany', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Arena', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Vosíme Vyškov', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'FRULI cafeteria', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
];

const memories = [
  {
    title: 'Páteční legenda',
    meta: 'Pivo · včera · 3 fotky',
    text: 'Tomáš konečně dorazil včas a nikdo mu to nevěřil.',
  },
  {
    title: 'Oběd u Radnice',
    meta: 'Oběd · dnes · hlasování skončilo',
    text: 'Vyhrála svíčková. Pavel tvrdí, že to bylo demokratické.',
  },
  {
    title: 'Krátké kolo po práci',
    meta: 'Kolo · sobota · 27 km',
    text: 'Vítr proti nám, nálada pořád dobrá.',
  },
];

const news = [
  {
    title: 'Vyškovsko dnes',
    summary:
      'AI shrne místní článek z Vyškovského deníku do jedné věty a nabídne rychlou akci pro partu.',
    tag: 'Zprávy',
  },
  {
    title: 'Kam vyrazit o víkendu',
    summary:
      'Události v okolí půjdou uložit jako plán: výlet, pivo po akci nebo položka do kroniky.',
    tag: 'Akce',
  },
];

export default function App() {
  const [selectedSection, setSelectedSection] = useState<SectionKey>('pivo');
  const [menuOpen, setMenuOpen] = useState(false);

  const selectedActivity = useMemo<ActivityKey>(
    () =>
      selectedSection === 'obed' || selectedSection === 'pivo' || selectedSection === 'kolo'
        ? selectedSection
        : 'pivo',
    [selectedSection],
  );

  const activeActivity = activityMeta[selectedActivity];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.appName}>OPK</Text>
              <Pressable style={styles.partyPill} onPress={() => setSelectedSection('party')}>
                <Text style={styles.partyLabel}>Parta</Text>
                <Text style={styles.partyName}>Vyškov</Text>
                <Text style={styles.partyChevron}>⌄</Text>
              </Pressable>
            </View>
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen((open) => !open)}>
              <Text style={styles.menuButtonText}>☰</Text>
            </Pressable>
          </View>

          {selectedSection === 'pivo' && <PivoScreen accent={activeActivity.accent} />}
          {selectedSection === 'obed' && <ObedScreen accent={activeActivity.accent} />}
          {selectedSection === 'kolo' && <KoloScreen accent={activeActivity.accent} />}
          {selectedSection === 'kronika' && <KronikaScreen onBack={() => setSelectedSection(selectedActivity)} />}
          {selectedSection === 'zpravy' && <ZpravyScreen onBack={() => setSelectedSection(selectedActivity)} />}
          {selectedSection === 'profil' && <ProfilScreen onBack={() => setSelectedSection(selectedActivity)} />}
          {selectedSection === 'party' && <PartyScreen onBack={() => setSelectedSection(selectedActivity)} />}
        </ScrollView>

        {menuOpen && (
          <AppMenu
            onClose={() => setMenuOpen(false)}
            onSelect={(section) => {
              setSelectedSection(section);
              setMenuOpen(false);
            }}
          />
        )}

        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const isActive = selectedSection === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setSelectedSection(item.key)}
                style={[styles.navButton, isActive && styles.navButtonActive]}
              >
                <Text style={[styles.navMark, isActive && styles.navMarkActive]}>
                  {item.mark}
                </Text>
                <Text style={[styles.navItem, isActive && styles.navItemActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function ActivityPanel({
  title,
  action,
  accent,
  children,
}: {
  title: string;
  action: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.detailPanel, { borderTopColor: accent }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.label}>Aktivita</Text>
          <Text style={styles.detailTitle}>{title}</Text>
        </View>
        <Pressable style={[styles.smallButton, { backgroundColor: accent }]}>
          <Text style={styles.smallButtonText}>{action}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function AppMenu({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (section: SectionKey) => void;
}) {
  const menuItems: Array<{ section: SectionKey; title: string; text: string }> = [
    { section: 'profil', title: 'Já', text: 'Profil, odznaky a nastavení.' },
    { section: 'party', title: 'Moje party', text: 'Parta Vyškov a pozvánky.' },
    { section: 'kronika', title: 'Kronika', text: 'Fotky, videa a hlášky.' },
    { section: 'zpravy', title: 'Zprávy', text: 'Souhrny z okolí Vyškova.' },
  ];

  return (
    <View style={styles.menuOverlay}>
      <Pressable style={styles.menuScrim} onPress={onClose} />
      <View style={styles.menuPanel}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Menu</Text>
          <Pressable style={styles.menuCloseButton} onPress={onClose}>
            <Text style={styles.menuCloseText}>×</Text>
          </Pressable>
        </View>
        {menuItems.map((item) => (
          <Pressable
            key={item.title}
            style={styles.menuItem}
            onPress={() => onSelect(item.section)}
          >
            <Text style={styles.menuItemTitle}>{item.title}</Text>
            <Text style={styles.drawerItemText}>{item.text}</Text>
          </Pressable>
        ))}
        <View style={styles.menuFooter}>
          <Text style={styles.menuFooterText}>Oběd · Pivo · Kolo</Text>
        </View>
      </View>
    </View>
  );
}

function BackToOpk({ onPress }: { onPress: () => void }) {
  return (
    <Text style={styles.sectionLink} onPress={onPress}>
      Zpět na OPK
    </Text>
  );
}

function ObedScreen({ accent }: { accent: string }) {
  const restaurantsWithMenu = lunchRestaurants.filter((restaurant) => restaurant.items.length > 0);

  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Dnes</Text>
        <Text style={styles.darkStatusTitle}>Dnešní meníčka</Text>
        <Text style={styles.darkStatusText}>
          {restaurantsWithMenu.length} podniků s obědovou nabídkou · zdroj Meníčka.cz
        </Text>
      </View>
      <ActivityPanel title="Oběd" action="Dáme oběd?" accent={accent}>
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Vyškov · podobně jako na webu</Text>
          {restaurantsWithMenu.map((restaurant) => (
            <View key={restaurant.name} style={styles.restaurantCard}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.cardTitle}>{restaurant.name}</Text>
                <View style={styles.chipRow}>
                  {restaurant.delivery && <Text style={styles.deliveryChip}>Rozvoz</Text>}
                  <Text style={restaurant.items.length > 0 ? styles.openChip : styles.closedChip}>
                    {restaurant.items.length > 0 ? 'Menu' : 'Bez menu'}
                  </Text>
                </View>
              </View>

              {restaurant.items.length > 0 ? (
                <View style={styles.menuRows}>
                  {restaurant.items.map((item, index) => (
                    <View key={`${restaurant.name}-${index}`} style={styles.menuRow}>
                      <View style={styles.menuTextGroup}>
                        <Text style={item.no ? styles.menuNumber : styles.soupLabel}>
                          {item.no || 'Polévka'}
                        </Text>
                        <Text style={styles.menuItemText}>{item.name}</Text>
                      </View>
                      {!!item.price && <Text style={styles.menuPrice}>{item.price}</Text>}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyMenuText}>{restaurant.message}</Text>
              )}

              <View style={styles.restaurantActions}>
                <Text style={styles.voteText}>Hlasovat</Text>
                <Text style={styles.voteText}>Otevřít na Meníčka.cz</Text>
              </View>
            </View>
          ))}
        </View>
      </ActivityPanel>
    </>
  );
}

function PivoScreen({ accent }: { accent: string }) {
  return (
    <>
      <View style={styles.statusPanel}>
        <View>
          <Text style={styles.labelOnDark}>Dnes</Text>
          <Text style={styles.statusTitle}>Hospoda je otevřená</Text>
          <Text style={styles.statusText}>Tomáš je tam · Marek jede · Pavel zatím mlčí</Text>
        </View>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Jsem tady</Text>
        </Pressable>
      </View>
      <ActivityPanel title="Pivo" action="Jedu tam" accent={accent}>
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Kdo je v hospodě?</Text>
          {['Tomáš · Jsem tady', 'Marek · Jedu tam', 'Pavel · Dneska ne'].map((item) => (
            <View key={item} style={styles.rowCard}>
              <Text style={styles.cardText}>{item}</Text>
              <Text style={styles.cardMeta}>upravit stav</Text>
            </View>
          ))}
        </View>
      </ActivityPanel>
    </>
  );
}

function KoloScreen({ accent }: { accent: string }) {
  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Počasí</Text>
        <Text style={styles.darkStatusTitle}>Dnes to jde</Text>
        <Text style={styles.darkStatusText}>22 °C · slabý vítr · bez deště · ideální okruh po práci</Text>
      </View>
      <ActivityPanel title="Kolo" action="Dáme kolo?" accent={accent}>
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Nejbližší vyjížďka</Text>
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>Okruh po práci</Text>
            <Text style={styles.cardMeta}>Dnes 17:30 · sraz u hospody · 31 km</Text>
            <Text style={styles.cardText}>Počasí na kolo: 22 °C, slabý vítr, bez deště.</Text>
            <Text style={styles.voteText}>2 jedou · Přidat se</Text>
          </View>
        </View>
      </ActivityPanel>
    </>
  );
}

function KronikaScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kronika</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.cardList}>
        {memories.map((memory) => (
          <View key={memory.title} style={styles.memoryCard}>
            <Text style={styles.cardTitle}>{memory.title}</Text>
            <Text style={styles.cardMeta}>{memory.meta}</Text>
            <Text style={styles.cardText}>{memory.text}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ZpravyScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Zprávy</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.cardList}>
        {news.map((item) => (
          <View key={item.title} style={styles.newsCard}>
            <Text style={styles.newsTag}>{item.tag}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.summary}</Text>
            <View style={styles.newsActions}>
              <Text style={styles.voteText}>Otevřít článek</Text>
              <Text style={styles.voteText}>Sdílet do party</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function ProfilScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.profilePanel}>
        <Text style={styles.profileAvatar}>M</Text>
        <Text style={styles.profileName}>Marek</Text>
        <Text style={styles.profileMeta}>Parta Vyškov · Klíčník · 42 návštěv</Text>
      </View>
      <View style={styles.cardList}>
        {['Pozvat kamaráda', 'Upozornění', 'Nastavení party', 'Odhlásit se'].map((item) => (
          <View key={item} style={styles.rowCard}>
            <Text style={styles.cardText}>{item}</Text>
            <Text style={styles.cardMeta}>otevřít</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function PartyScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moje party</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.activePartyCard}>
        <Text style={styles.label}>Vybraná parta</Text>
        <Text style={styles.activePartyTitle}>Parta Vyškov</Text>
        <Text style={styles.darkStatusText}>3 členové · domovská hospoda · OPK režim</Text>
        <View style={styles.partyMembers}>
          {['Marek', 'Tomáš', 'Pavel'].map((member) => (
            <Text key={member} style={styles.memberChip}>
              {member}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.inviteCard}>
        <View>
          <Text style={styles.label}>Pozvánka</Text>
          <Text style={styles.inviteCode}>OPK-VYSKOV</Text>
        </View>
        <Text style={styles.darkCardAction}>Sdílet kód</Text>
      </View>

      <View style={styles.cardList}>
        {[
          'Vytvořit novou partu',
          'Pozvat kamaráda',
          'Správci a role',
          'Nastavení party',
        ].map((item) => (
          <View key={item} style={styles.rowCard}>
            <Text style={styles.cardText}>{item}</Text>
            <Text style={styles.cardMeta}>otevřít</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F3ED',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
  },
  appShell: {
    flex: 1,
  },
  screen: {
    gap: 14,
    padding: 20,
    paddingBottom: 112,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  appName: {
    backgroundColor: '#15251F',
    borderRadius: 8,
    color: '#F8B84E',
    fontSize: 17,
    fontWeight: '900',
    height: 38,
    letterSpacing: 0,
    lineHeight: 38,
    overflow: 'hidden',
    textAlign: 'center',
    width: 48,
  },
  partyPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  partyLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  partyName: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  partyChevron: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '900',
    marginTop: -2,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuButtonText: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 25,
  },
  statusPanel: {
    backgroundColor: '#15251F',
    borderRadius: 8,
    gap: 18,
    padding: 18,
  },
  statusPanelLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  labelOnDark: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  statusText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  darkStatusTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  darkStatusText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionLink: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderTopWidth: 5,
    gap: 14,
    padding: 16,
  },
  detailTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cardList: {
    gap: 10,
  },
  subsectionTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '900',
  },
  menuCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  restaurantHeader: {
    alignItems: 'flex-start',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deliveryChip: {
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  openChip: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  closedChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  menuRows: {
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    marginTop: 12,
  },
  menuRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#EEF0F3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  menuTextGroup: {
    flex: 1,
    gap: 3,
  },
  menuNumber: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '900',
  },
  soupLabel: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
  },
  menuItemText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 19,
  },
  menuPrice: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 56,
    textAlign: 'right',
  },
  emptyMenuText: {
    backgroundColor: '#F9FAFB',
    borderRadius: 7,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 12,
    padding: 11,
  },
  restaurantActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  price: {
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  cardText: {
    color: '#1F2937',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  voteText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
  rowCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  newsTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  menuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  menuScrim: {
    backgroundColor: 'rgba(17, 24, 39, 0.26)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 14,
    gap: 8,
    padding: 12,
    position: 'absolute',
    right: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    top: 12,
    width: 260,
  },
  menuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  menuTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  menuCloseButton: {
    alignItems: 'center',
    borderRadius: 7,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  menuCloseText: {
    color: '#6B7280',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 30,
  },
  menuItem: {
    backgroundColor: '#F9FAFB',
    borderColor: '#EEF0F3',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  menuItemTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  drawerItemText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  menuFooter: {
    borderTopColor: '#EEF0F3',
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
  },
  menuFooterText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profilePanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  profileAvatar: {
    backgroundColor: '#164E63',
    borderRadius: 32,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    height: 64,
    lineHeight: 64,
    overflow: 'hidden',
    textAlign: 'center',
    width: 64,
  },
  profileName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
  profileMeta: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  activePartyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  activePartyTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  partyMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  memberChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inviteCard: {
    alignItems: 'center',
    backgroundColor: '#15251F',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  inviteCode: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },
  darkCardAction: {
    color: '#F8B84E',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E0D8',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 0,
    elevation: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    left: 20,
    padding: 8,
    position: 'absolute',
    right: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: 2,
  },
  navButtonActive: {
    backgroundColor: '#15251F',
  },
  navMark: {
    color: '#6B7280',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  navMarkActive: {
    color: '#F8B84E',
  },
  navItem: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  navItemActive: {
    color: '#FFFFFF',
  },
});
