
import { Person } from './types';

export const familyData: Person = {
  id: "amin-arab",
  name: "امین عرب",
  title: "جد بزرگ",
  description: "اجداد احتمالا از اعراب خوزستانی (خرمشهر) هستند که به مناطق مرکزی ایران مهاجرت کردند.",
  children: [
    {
      id: "sadegh-reza",
      name: "صادق رضا",
      title: "فرزند امین عرب",
      children: [
        {
          id: "reza-sadegh",
          name: "رضا",
          surname: "لباف فریزهندی",
          title: "معروف به رضا صادق",
          children: [
            {
              id: "mash-ali",
              name: "علی",
              surname: "لباف فریزهندی",
              title: "مشهدی",
              children: [
                {
                  id: "azra-labaf",
                  name: "عذرا",
                  surname: "لباف فریزهندی",
                  spouseName: "اصغر روایی",
                  description: "همسر مرحوم اصغر روایی (دختر عمو پسر عمو)",
                  children: [
                    {
                      id: "hamid-azra",
                      name: "حمید",
                      children: [
                        { id: "negar", name: "نگار" },
                        { id: "neda", name: "ندا" },
                        { id: "negin-hamid", name: "نگین" }
                      ]
                    },
                    {
                      id: "saeid-azra",
                      name: "سعید",
                      children: [
                        { id: "fatemeh-saeid", name: "فاطمه" },
                        { id: "helia", name: "هلیا" }
                      ]
                    },
                    {
                      id: "zahra-azra",
                      name: "زهرا",
                      children: [
                        { id: "ali-zahra", name: "علی" },
                        { id: "niayesh", name: "نیایش" }
                      ]
                    }
                  ]
                },
                {
                  id: "ghasem-labaf",
                  name: "قاسم",
                  surname: "لباف فریزهندی",
                  spouseName: "اشرف لباف",
                  description: "همسر مرحومه اشرف (دختر عمو پسر عمو)",
                  children: [
                    {
                      id: "mojtaba-gh",
                      name: "مجتبی",
                      children: [{ id: "setayesh-moj", name: "ستایش" }]
                    },
                    {
                      id: "mohammad-gh",
                      name: "محمد",
                      children: [{ id: "hasti-mohammad", name: "هستی" }]
                    },
                    {
                      id: "mona-gh",
                      name: "منا",
                      children: [
                        { id: "abolfazl-mona", name: "ابوالفضل" },
                        { id: "bahar-mona", name: "بهار" }
                      ]
                    }
                  ]
                },
                { id: "aghdas-labaf", name: "اقدس", surname: "لباف فریزهندی", description: "فرزندی ندارد" },
                {
                  id: "esmat-labaf",
                  name: "عصمت",
                  surname: "لباف فریزهندی",
                  children: [
                    { id: "leila-esmat", name: "لیلا", children: [{ id: "fatemeh-leila", name: "فاطمه" }] },
                    { id: "javad-esmat", name: "جواد", children: [{ id: "kasra-javad", name: "کسری" }] },
                    { id: "esmail-esmat", name: "اسماعیل", status: ["مجرد"] }
                  ]
                },
                {
                  id: "mohsen-labaf",
                  name: "محسن",
                  surname: "لباف فریزهندی",
                  children: [
                    { id: "abolfazl-mohsen", name: "ابوالفضل", status: ["مجرد"] },
                    { id: "amir-mohsen", name: "امیر", status: ["مجرد"] }
                  ]
                },
                {
                  id: "shahrbanoo-labaf",
                  name: "شهربانو",
                  surname: "لباف فریزهندی",
                  children: [
                    { id: "maryam-sh", name: "مریم", children: [{ id: "setayesh-maryam", name: "ستایش" }] },
                    { id: "mahdi-sh", name: "مهدی", children: [{ id: "radmehr", name: "راد مهر" }] },
                    { id: "hossein-sh", name: "حسین", children: [{ id: "samin", name: "ثمین" }] }
                  ]
                }
              ]
            },
            {
              id: "nematollah-labaf",
              name: "نعمت الله",
              surname: "لباف فریزهندی",
              title: "کربلایی (مشدی)",
              spouseName: "صغرا / جواهر",
              children: [
                {
                  id: "rahmat-nemat",
                  name: "رحمت",
                  spouseName: "مرصع (ناهید)",
                  description: "همسر مرصع/ناهید (دختر خاله پسر خاله)",
                  children: [
                    { id: "alireza-rahmat", name: "علیرضا", children: [{ id: "maneli", name: "مانلی" }] },
                    { id: "hossein-rahmat", name: "حسین", children: [{ id: "janya", name: "ژانیا" }, { id: "arzin", name: "آرزین" }] },
                    { id: "mohsen-rahmat", name: "محسن", children: [{ id: "liam", name: "لیام" }] }
                  ]
                },
                { id: "ashraf-nemat", name: "اشرف", status: ["مرحوم"], description: "همسر قاسم (دختر عمو پسر عمو)" },
                {
                  id: "ebrahim-nemat",
                  name: "ابراهیم",
                  children: [
                    { id: "ali-ebrahim", name: "علی", children: [{ id: "anita", name: "آنیتا" }] },
                    { id: "erfan-ebrahim", name: "عرفان", status: ["مجرد"] },
                    { id: "ehsan-ebrahim", name: "احسان", status: ["مجرد"] }
                  ]
                },
                { id: "fatemeh-nemat", name: "فاطمه" }
              ]
            },
            {
              id: "sakineh-beygum",
              name: "سکینه بیگم",
              children: [
                {
                  id: "azam-sakineh",
                  name: "اعظم",
                  children: [
                    { id: "amir-hossein-azam", name: "امیر حسین", children: [{ id: "child-amir-h", name: "فرزند امیرحسین" }] },
                    { id: "amin-azam", name: "امین", description: "فرزندی ندارد" },
                    { id: "abbas-azam", name: "عباس", status: ["مجرد"] },
                    { id: "ali-azam", name: "علی", status: ["مجرد"] }
                  ]
                },
                {
                  id: "akram-sakineh",
                  name: "اکرم",
                  children: [
                    { id: "mahdi-akram", name: "مهدی", status: ["مجرد"] },
                    { id: "mahshid-akram", name: "مهشید", status: ["مجرد"] }
                  ]
                },
                { id: "amir-sakineh", name: "امیر" },
                { id: "hamid-sakineh", name: "حمید", children: [{ id: "kourosh", name: "کوروش" }] }
              ]
            },
            {
              id: "mostafa-reza",
              name: "مصطفی",
              status: ["مرحوم"],
              children: [
                { id: "farzaneh-mostafa", name: "فرزانه", children: [{ id: "mostafa-farzaneh", name: "مصطفی" }] },
                { id: "faramarz-mostafa", name: "فرامرز", description: "فرزندی ندارد" },
                { id: "afsaneh-mostafa", name: "افسانه" },
                {
                  id: "roksana-mostafa",
                  name: "رکسانا",
                  children: [
                    { id: "haniyeh-rok", name: "هانیه", status: ["مجرد"] },
                    { id: "hadiseh-rok", name: "حدیثه", status: ["مجرد"] }
                  ]
                }
              ]
            },
            {
              id: "zarin-taj",
              name: "زرین تاج",
              title: "عمه زهرا",
              children: [
                {
                  id: "masoud-zarin",
                  name: "مسعود",
                  status: ["مرحوم"],
                  children: [
                    { id: "fatemeh-masoud", name: "فاطمه" },
                    { id: "mohammad-johnson", name: "محمد جانسون" },
                    { id: "danial-masoud", name: "دانیال" }
                  ]
                },
                {
                  id: "mahmoud-zarin",
                  name: "محمود",
                  children: [
                    { id: "hamed-mahmoud", name: "حامد", children: [{ id: "ala-hamed", name: "الا" }] },
                    { id: "elika-mahmoud", name: "الیکا", status: ["مجرد"] }
                  ]
                },
                {
                  id: "majid-zarin",
                  name: "مجید",
                  children: [
                    { id: "mo-javad-majid", name: "محمد جواد", status: ["مجرد"] },
                    { id: "ali-majid", name: "علی", status: ["مجرد"] },
                    { id: "negin-majid", name: "نگین", status: ["مجرد"] }
                  ]
                }
              ]
            },
            {
              id: "morteza-reza",
              name: "مرتضی",
              children: [
                { id: "faran-m", name: "فاران" },
                { id: "sara-m", name: "سارا" },
                { id: "sima-m", name: "سیما" },
                { id: "hosna-m", name: "حسنا" },
                { id: "yasin-m", name: "یاسین" }
              ]
            }
          ]
        },
        { id: "hassan-sadegh", name: "حسن صادق", status: ["مرحوم"], description: "در جوانی فوت شده و فرزندی نداشته." },
        {
          id: "hossein-timsar",
          name: "حسین",
          title: "معروف به تیمسار",
          children: [
            { id: "akram-h", name: "اکرم" },
            { id: "azam-h", name: "اعظم", status: ["مرحوم"] },
            { id: "ashraf-h", name: "اشرف", status: ["مرحوم"] },
            { id: "azar-h", name: "آذر" },
            { id: "fatemeh-h", name: "فاطمه" },
            { id: "zahra-h", name: "زهرا" },
            { id: "alireza-h", name: "علیرضا" },
            { id: "zohreh-h", name: "زهره" },
            { id: "esfandiar-h", name: "اسفندیار" },
            { id: "abbas-h", name: "عباس" }
          ]
        },
        {
          id: "mohammad-sadegh-alam",
          name: "محمد صادق",
          title: "علمدار چیمه",
          children: [
            {
              id: "abbas-mohammad",
              name: "عباس",
              status: ["مرحوم"],
              children: [
                {
                  id: "ali-abbas",
                  name: "علی",
                  status: ["مرحوم"],
                  children: [
                    { id: "mahdi-ali-abbas", name: "مهدی", children: [{ id: "nima-mahdi", name: "نیما" }] },
                    { id: "mehrdad-ali-abbas", name: "مهرداد", children: [{ id: "armita-mehrdad", name: "آرمیتا" }] },
                    { id: "mehran-ali-abbas", name: "مهران", description: "فرزند ندارد" }
                  ]
                },
                {
                  id: "azam-abbas",
                  name: "اعظم",
                  children: [
                    { id: "amir-azam-abbas", name: "امیر", status: ["مجرد"] },
                    { id: "bita-azam-abbas", name: "بیتا", description: "فرزند ندارد" }
                  ]
                },
                { id: "gholamreza-abbas", name: "غلامرضا" },
                { id: "akram-abbas", name: "اکرم", children: [{ id: "arash-akram", name: "آرش" }, { id: "shima-akram", name: "شیما" }] },
                { id: "mani-abbas", name: "مانی", status: ["مجرد"] },
                {
                  id: "reza-abbas",
                  name: "رضا",
                  children: [
                    { id: "milad-reza", name: "میلاد", children: [{ id: "dorsa-milad", name: "درسا" }] },
                    { id: "ali-reza-mil", name: "علی", description: "فرزند ندارد" }
                  ]
                }
              ]
            },
            { id: "javaher-mohammad", name: "جواهر", status: ["مرحوم"], description: "همسر نعمت‌الله (دختر عمو پسر عمو)" },
            {
              id: "sadegh-khan",
              name: "صادق",
              title: "خان خندق",
              children: [
                {
                  id: "mehri-sadegh",
                  name: "مهری",
                  children: [
                    { id: "javad-mehri", name: "جواد", children: [{ id: "mohammad-saleh", name: "محمد صالح" }] },
                    { id: "hamed-mehri", name: "حامد", description: "فرزند ندارد" },
                    { id: "maryam-mehri", name: "مریم", description: "فرزند ندارد" },
                    { id: "mohammad-mehri", name: "محمد", children: [{ id: "mahrou", name: "مه رو" }] }
                  ]
                },
                {
                  id: "gholamhossein-sadegh",
                  name: "غلامحسین",
                  title: "حاج",
                  children: [
                    { id: "fatemeh-gh", name: "فاطمه", description: "متاهل می باشد" },
                    { id: "mo-hossein-gh", name: "محمد حسین" }
                  ]
                },
                {
                  id: "jafar-sadegh",
                  name: "جعفر",
                  children: [
                    {
                      id: "ali-jafar-s",
                      name: "علی",
                      children: [{ id: "amir-masiha", name: "امیر مسیحا" }, { id: "danial-ali-j", name: "دانیال" }]
                    },
                    { id: "amir-hossein-jafar", name: "امیر حسین", description: "فرزند ندارد" },
                    { id: "amir-mohammad-jafar", name: "امیر محمد", description: "فرزند ندارد" }
                  ]
                },
                {
                  id: "monir-sadegh",
                  name: "منیر",
                  children: [
                    { id: "mahdieh-monir", name: "مهدیه", description: "فرزند ندارد" },
                    { id: "ali-monir", name: "علی", children: [{ id: "amir-mahdi-ali", name: "امیر مهدی" }, { id: "parsa-ali", name: "پارسا" }] },
                    { id: "marzieh-monir", name: "مرضیه", children: [{ id: "hossein-marzieh", name: "حسین" }] }
                  ]
                },
                {
                  id: "kazem-sadegh",
                  name: "کاظم",
                  children: [
                    { id: "niloufar-kazem", name: "نیلوفر", status: ["مجرد"], gender: "female" },
                    { id: "kiana-kazem", name: "کیانا", status: ["مجرد"], gender: "female" }
                  ]
                },
                { id: "masoumeh-sadegh", name: "معصومه" },
                { id: "mitra-sadegh", name: "میترا", children: [{ id: "ilia-mitra", name: "ایلیا" }, { id: "romina-mitra", name: "رومینا" }] },
                {
                  id: "mohammad-reza-sadegh",
                  name: "محمد رضا",
                  children: [
                    { id: "amir-hesam-mo", name: "امیر حسام", status: ["مجرد"] },
                    { id: "heeva-mo", name: "هیوا", status: ["مجرد"] }
                  ]
                },
                { id: "alireza-sadegh-khan", name: "علیرضا", status: ["مجرد"] }
              ]
            },
            {
              id: "hossein-mohammad",
              name: "حسین",
              status: ["مرحوم"],
              children: [
                { id: "mahdi-shahid-h", name: "مهدی", status: ["شهید"] },
                { id: "hadi-h", name: "هادی" },
                { id: "mohammad-h", name: "محمد" },
                { id: "amir-h-h", name: "امیر" }
              ]
            }
          ]
        },
        {
          id: "ali-akbar-haji",
          name: "علی اکبر",
          title: "حاج",
          children: [
            { id: "nasser-ali-akbar", name: "ناصر", status: ["مرحوم"], children: [{ id: "amir-nasser-a", name: "امیر" }] },
            { id: "shamsi-ali-akbar", name: "شمسی", children: [{ id: "afshin-shamsi", name: "افشین" }] },
            { id: "javad-ali-akbar", name: "جواد", status: ["مجرد"] },
            { id: "mansour-ali-akbar", name: "منصور", description: "فرزندی ندارد" }
          ]
        },
        {
          id: "amin-sadegh-reza",
          name: "امین صادق",
          children: [
            { id: "shokrollah-amin", name: "شکراله" },
            { id: "asghar-amin", name: "اصغر", spouseName: "عذرا لباف", description: "همسر عذرا لباف (دختر عمو پسر عمو)" },
            { id: "soghra-amin", name: "صغرا", spouseName: "مشدی نعمت الله", description: "همسر اول مشدی نعمت‌الله", children: [{ id: "rahmat-soghra-2", name: "رحمت" }] },
            {
              id: "rezvan-amin",
              name: "رضوان",
              children: [
                {
                  id: "ali-akbar-rezvan-2",
                  name: "علی اکبر",
                  children: [
                    { id: "benjamin-ali", name: "بنیامین", status: ["مجرد"] },
                    { id: "elmira-ali", name: "المیرا", status: ["مجرد"] },
                    { id: "reza-ali", name: "رضا", status: ["مجرد"] }
                  ]
                },
                { id: "nahid-rezvan", name: "مرصع (ناهید)", spouseName: "رحمت", gender: "female", description: "همسر رحمت فرزند مرحوم نعمت‌الله (دختر خاله پسر خاله)" },
                { id: "fariba-rezvan", name: "فریبا" },
                { id: "sorour-rezvan", name: "سرور" }
              ]
            },
            { id: "mahdi-amin-sadegh", name: "مهدی", children: [{ id: "fatemeh-mahdi-amin", name: "فاطمه" }] }
          ]
        },
        {
          id: "saltanat-ameh",
          name: "سلطنت",
          title: "عمه",
          children: [
            { id: "ahmad-saltanat", name: "احمد", description: "پدر طاهره (ساکن سبزوار)" },
            { id: "ali-saltanat-2", name: "علی" },
            { id: "zari-saltanat", name: "زری" },
            { id: "esmail-saltanat", name: "اسماعیل" }
          ]
        },
        {
          id: "shahrbanoo-sadegh",
          name: "شهربانو",
          description: "زن رضا رشتی",
          children: [
            { id: "narges-shahr", name: "نرگس" },
            { id: "masoumeh-shahr", name: "معصومه" },
            { id: "hossein-shahr", name: "حسین" }
          ]
        },
        { id: "fatemeh-morteza-zen", name: "فاطمه", description: "زن عمو مرتضی" },
        {
          id: "agha-reza-sadegh",
          name: "آقا رضا",
          children: [
            { id: "rahim-ar", name: "رحیم" },
            { id: "vali-ar", name: "ولی" },
            { id: "safar-ar", name: "صفر" },
            { id: "morteza-ar", name: "مرتضی" },
            { id: "parvin-ar", name: "پروین" },
            { id: "sheikh-hassan-ar", name: "حسن", title: "شیخ" }
          ]
        },
        {
          id: "jafar-amou",
          name: "جعفر",
          title: "عمو",
          children: [
            { id: "hossein-jafar-2", name: "حسین" },
            { id: "ali-jafar-2", name: "علی" }
          ]
        },
        {
          id: "khorshid-ameh",
          name: "خورشید",
          title: "عمه",
          children: [
            { id: "seyed-javad-kh", name: "سید جواد" },
            { id: "seyed-abdollah-kh", name: "سید عبدالله" },
            { id: "afagh-kh", name: "آفاق" },
            { id: "hassan-kh-kh", name: "حسن" },
            { id: "mahdi-kh-kh", name: "مهدی" },
            { id: "mohammad-kh-kh", name: "محمد" }
          ]
        },
        { id: "naz-ameh", name: "ناز", title: "عمه", description: "اطلاعی در دست نیست" }
      ]
    }
  ]
};

export const aliMashallahData: Person = {
    id: "ali-mashallah-root",
    name: "مرحوم علی ماشاءالله",
    title: "جد",
    children: [
        {
            id: "sadegh-reza-am",
            name: "مرحوم صادق رضا",
            children: [
                {
                    id: "amin-sadegh-am",
                    name: "مرحوم امین صادق",
                    children: [
                        { id: "asghar-amin-am", name: "مرحوم اصغر", children: [ {id: "saeid-as", name: "سعید"}, {id: "hamid-as", name: "حمید"} ] },
                        { id: "mehdi-amin-am", name: "مهمدی" }
                    ]
                },
                {
                    id: "ali-akbar-am",
                    name: "مرحوم علی اکبر صادق",
                    children: [
                        { id: "naser-ali-akbar-am", name: "مرحوم ناصر", children: [{id: "javad-naser", name: "جواد"}, {id: "mansour-naser", name: "منصور"}, {id: "amir-naser", name: "امیر"}] }
                    ]
                },
                {
                    id: "mohammad-sadegh-am",
                    name: "مرحوم محمد صادق",
                    children: [
                        { id: "abbas-mo-am", name: "مرحوم عباس", children: [
                            {id: "reza-ab-am", name: "رضا"},
                            {id: "ali-ab-am", name: "مرحوم علی", children: [{id: "milad-ali-ab", name: "میلاد"}, {id: "mehrdad-ali-ab", name: "مهرداد"}, {id: "mehran-ali-ab", name: "مهران"}]} 
                        ]},
                        { id: "sadegh-mo-am", name: "مرحوم صادق", children: [
                            {id: "ali-reza-sadegh-mo", name: "علیرضا"},
                            {id: "mohammad-reza-sadegh-mo", name: "محمدرضا", children: [{id: "amir-hesam", name: "امیرحسام"}]},
                            {
                                id: "kazem-sadegh-mo",
                                name: "کاظم",
                                children: [
                                    { id: "niloufar-kazem-mo", name: "نیلوفر", status: ["مجرد"], gender: "female" },
                                    { id: "kiana-kazem-mo", name: "کیانا", status: ["مجرد"], gender: "female" }
                                ]
                            },
                            {id: "jafar-sadegh-mo", name: "جعفر", children: [{id: "amir-hossein-j", name: "امیرحسین"}, {id: "amir-mohammad-j", name: "امیرمحمد"}, {id: "ali-jafar", name: "علی", children: [{id: "masiha", name: "مسیحا"}, {id: "danial", name: "دانیال"}]}]},
                            {id: "gholam-hossein-sadegh-mo", name: "غلامحسین", children: [{id: "mohammad-hossein", name: "محمدحسین"}]}
                        ]}
                    ]
                },
                {
                    id: "hassan-sadegh-am",
                    name: "مرحوم حسن صادق",
                    children: [
                        { id: "abbas-hassan-am", name: "عباس" },
                        { id: "esfandiar-hassan-am", name: "اسفندیار" },
                        { id: "alireza-hassan-am", name: "علیرضا" }
                    ]
                },
                {
                    id: "hossein-sadegh-am",
                    name: "مرحوم حسین صادق",
                    children: [
                        { id: "morteza-hossein-am", name: "مرتضی", children: [{id: "yasin-morteza", name: "یاسین"}] },
                        { id: "mostafa-hossein-am", name: "مصطفی", children: [{id: "faramarz-mostafa", name: "فرامرز"}] }
                    ]
                },
                {
                    id: "reza-sadegh-am",
                    name: "مرحوم رضا صادق",
                    children: [
                        { id: "ali-reza-am", name: "مرحوم علی", children: [
                            {id: "nemat-ollah", name: "مرحوم نعمت الله", children: [{id: "ebrahim-n", name: "ابراهیم"}, {id: "rahim-n", name: "رحیم"}]}
                        ]},
                        { id: "ghasem-reza-am", name: "قاسم", children: [{id: "mohammad-gh-am", name: "محمد"}, {id: "mojtaba-gh-am", name: "مجتبی"}] },
                        { id: "mohsen-reza-am", name: "محسن", children: [{id: "amir-mohsen-am", name: "امیر"}, {id: "abolfazl-mohsen-am", name: "ابوالفضل"}] },
                        { id: "mash-ali-reza-am", name: "محمد علی", children: [{id: "ali-akbar-mash", name: "علی اکبر"}, {id: "ali-reza-mash", name: "علیرضا"}, {id: "hossein-mash", name: "حسین"}, {id: "erfan-mash", name: "عرفان"}] }
                    ]
                }
            ]
        }
    ]
};
