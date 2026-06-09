"""Run once to create admin account and sample books."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fpdf import FPDF
from database import SessionLocal, engine
import models
from auth import get_password_hash

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

SAMPLE_BOOKS = [
    {
        "title": "Python编程入门",
        "author": "张三",
        "description": "适合初学者的Python教程，涵盖基础语法、数据结构和实战项目。",
        "category": "编程技术",
        "chapters": [
            ("Chapter 1: Getting Started with Python",
             "Python is a high-level, interpreted programming language known for its simplicity "
             "and readability. Created by Guido van Rossum in 1991, it has become one of the most "
             "popular languages worldwide.\n\nKey features:\n- Clear and readable syntax\n"
             "- Dynamic typing\n- Extensive standard library\n- Cross-platform support\n\n"
             "Installation: Download Python from python.org and follow the installer instructions."),
            ("Chapter 2: Variables and Data Types",
             "In Python, variables are created when you assign a value:\n\n"
             "  name = 'Alice'\n  age = 30\n  height = 1.75\n  is_student = True\n\n"
             "Python supports these built-in types:\n- str: text strings\n- int: integers\n"
             "- float: decimal numbers\n- bool: True or False\n- list: ordered collections\n"
             "- dict: key-value pairs"),
            ("Chapter 3: Control Flow",
             "Conditional statements:\n\n  if age >= 18:\n      print('Adult')\n  else:\n"
             "      print('Minor')\n\nLoops:\n\n  for i in range(5):\n      print(i)\n\n"
             "  while count > 0:\n      count -= 1\n\nFunctions:\n\n"
             "  def greet(name):\n      return f'Hello, {name}!'"),
        ],
    },
    {
        "title": "数据结构与算法",
        "author": "李四",
        "description": "深入讲解常见数据结构和算法，包括排序、搜索和图算法。",
        "category": "编程技术",
        "chapters": [
            ("Chapter 1: Arrays and Linked Lists",
             "Arrays store elements in contiguous memory locations, enabling O(1) random access.\n\n"
             "Linked Lists connect nodes via pointers, enabling O(1) insertion and deletion.\n\n"
             "Complexity comparison:\n- Array access: O(1)\n- Array insert: O(n)\n"
             "- List access: O(n)\n- List insert: O(1)"),
            ("Chapter 2: Stacks and Queues",
             "Stack (LIFO - Last In, First Out):\n  push(x) - add to top\n"
             "  pop() - remove from top\n  peek() - view top element\n\n"
             "Queue (FIFO - First In, First Out):\n  enqueue(x) - add to back\n"
             "  dequeue() - remove from front\n\nApplications:\n"
             "- Stack: function calls, expression evaluation\n- Queue: BFS, task scheduling"),
            ("Chapter 3: Sorting Algorithms",
             "Quick Sort: Average O(n log n), divide and conquer strategy.\n\n"
             "Merge Sort: O(n log n) guaranteed, stable sort.\n\n"
             "Bubble Sort: O(n^2), simple but inefficient.\n\n"
             "Heap Sort: O(n log n), in-place sorting.\n\n"
             "For most practical cases, Quick Sort is preferred due to its cache efficiency."),
        ],
    },
    {
        "title": "人工智能基础",
        "author": "王五",
        "description": "介绍机器学习和深度学习基本概念，为AI入门者提供系统学习路径。",
        "category": "人工智能",
        "chapters": [
            ("Chapter 1: Introduction to Machine Learning",
             "Machine Learning enables computers to learn from data without explicit programming.\n\n"
             "Three main paradigms:\n1. Supervised Learning - learns from labeled examples\n"
             "2. Unsupervised Learning - finds patterns in unlabeled data\n"
             "3. Reinforcement Learning - learns through trial and reward\n\n"
             "Common applications: image recognition, spam filtering, recommendation systems."),
            ("Chapter 2: Neural Networks",
             "Artificial Neural Networks are inspired by biological neurons.\n\n"
             "A neuron computes: output = activation(weights * inputs + bias)\n\n"
             "Deep Learning uses many layers to learn hierarchical representations.\n\n"
             "Common architectures:\n- CNN: image processing\n- RNN/LSTM: sequential data\n"
             "- Transformer: natural language processing\n- GAN: generative models"),
            ("Chapter 3: Practical Applications",
             "Computer Vision:\n- Image classification\n- Object detection\n- Semantic segmentation\n\n"
             "Natural Language Processing:\n- Sentiment analysis\n- Machine translation\n"
             "- Question answering\n- Text generation\n\n"
             "Tools: Python, TensorFlow, PyTorch, scikit-learn, Hugging Face Transformers."),
        ],
    },
    {
        "title": "Web开发实战",
        "author": "赵六",
        "description": "从零开始学习现代Web开发，涵盖HTML、CSS、JavaScript及主流框架。",
        "category": "编程技术",
        "chapters": [
            ("Chapter 1: HTML Fundamentals",
             "HTML (HyperText Markup Language) is the backbone of every web page.\n\n"
             "Basic structure:\n  <!DOCTYPE html>\n  <html lang='en'>\n  <head>\n"
             "    <meta charset='UTF-8'>\n    <title>My Page</title>\n  </head>\n"
             "  <body>\n    <h1>Hello World</h1>\n    <p>Welcome!</p>\n  </body>\n  </html>\n\n"
             "Semantic elements: header, nav, main, article, section, footer."),
            ("Chapter 2: CSS Styling",
             "CSS controls the visual presentation of HTML elements.\n\n"
             "Selectors:\n  p { color: red; }          /* tag */\n"
             "  .card { padding: 16px; }   /* class */\n"
             "  #hero { background: blue; }  /* id */\n\n"
             "Layout systems:\n- Flexbox: one-dimensional layouts\n"
             "- Grid: two-dimensional layouts\n- Position: absolute/relative/fixed"),
            ("Chapter 3: JavaScript and React",
             "JavaScript adds interactivity to web pages.\n\n"
             "Modern JS features (ES2020+):\n- Arrow functions: const add = (a, b) => a + b\n"
             "- Destructuring: const { name, age } = person\n"
             "- Async/await: const data = await fetch(url).then(r => r.json())\n\n"
             "React is a component-based UI library:\n  function App() {\n"
             "    const [count, setCount] = useState(0)\n"
             "    return <button onClick={() => setCount(c => c+1)}>{count}</button>\n  }"),
        ],
    },
    {
        "title": "系统设计指南",
        "author": "陈七",
        "description": "大规模分布式系统设计实践，适合准备技术面试或提升架构能力的工程师。",
        "category": "系统架构",
        "chapters": [
            ("Chapter 1: Scalability Fundamentals",
             "Key properties of reliable systems:\n- Availability: system remains operational\n"
             "- Scalability: handles growing load\n- Reliability: works correctly over time\n"
             "- Maintainability: easy to operate and evolve\n\n"
             "Scaling strategies:\n- Vertical: upgrade single machine (CPU, RAM)\n"
             "- Horizontal: add more machines (preferred for large scale)\n\n"
             "Load balancers distribute traffic across servers."),
            ("Chapter 2: Database Design",
             "Relational databases (PostgreSQL, MySQL):\n- ACID transactions\n"
             "- Strong consistency\n- Complex queries with SQL\n\n"
             "NoSQL databases:\n- Document (MongoDB): flexible schemas\n"
             "- Key-Value (Redis): ultra-fast caching\n- Column (Cassandra): write-heavy workloads\n"
             "- Graph (Neo4j): relationship queries\n\n"
             "Sharding partitions data across nodes; Replication copies data for redundancy."),
            ("Chapter 3: Caching and CDN",
             "Caching reduces latency and database load.\n\n"
             "Cache patterns:\n- Cache-Aside: app checks cache, falls back to DB\n"
             "- Write-Through: write to cache and DB simultaneously\n"
             "- Write-Behind: write to cache, async flush to DB\n\n"
             "CDN (Content Delivery Network) serves static assets from geographically "
             "distributed servers, reducing latency for global users.\n\n"
             "Redis supports: strings, hashes, lists, sets, sorted sets, pub/sub."),
        ],
    },
]


MSYH_FONT = next((f for f in [
    r"C:\Windows\Fonts\msyh.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
] if os.path.exists(f)), None)
MSYHBD_FONT = next((f for f in [
    r"C:\Windows\Fonts\msyhbd.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
] if os.path.exists(f)), None)


def make_pdf(title: str, author: str, chapters: list) -> FPDF:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    has_cjk = bool(MSYH_FONT)
    if has_cjk:
        pdf.add_font("msyh", fname=MSYH_FONT)
        pdf.add_font("msyhbd", fname=MSYHBD_FONT or MSYH_FONT)

    def set_bold(size):
        pdf.set_font("msyhbd" if has_cjk else "Helvetica", "" if has_cjk else "B", size)

    def set_regular(size):
        pdf.set_font("msyh" if has_cjk else "Helvetica", "", size)

    # Cover page
    pdf.add_page()
    set_bold(26)
    pdf.ln(40)
    pdf.multi_cell(0, 14, title, align="C")
    pdf.ln(8)
    set_regular(16)
    pdf.multi_cell(0, 10, f"作者：{author}", align="C")
    pdf.ln(20)
    set_regular(11)
    pdf.multi_cell(0, 8, "私人图书馆 · Private Library Collection", align="C")

    # Chapters
    for ch_title, ch_body in chapters:
        pdf.add_page()
        set_bold(15)
        pdf.multi_cell(0, 10, ch_title)
        pdf.ln(5)
        set_regular(11)
        pdf.multi_cell(0, 7, ch_body)

    return pdf


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create admin
        if not db.query(models.Admin).filter(models.Admin.username == ADMIN_USERNAME).first():
            db.add(models.Admin(
                username=ADMIN_USERNAME,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
            ))
            db.commit()
            print(f"Admin created — username: {ADMIN_USERNAME}  password: {ADMIN_PASSWORD}")

        # Create sample books
        if db.query(models.Book).count() == 0:
            from database import DATA_DIR
            books_dir = os.path.join(DATA_DIR, "uploads", "books")
            os.makedirs(books_dir, exist_ok=True)

            for i, book_data in enumerate(SAMPLE_BOOKS, 1):
                file_path = os.path.join(books_dir, f"sample_{i:02d}.pdf")
                pdf = make_pdf(book_data["title"], book_data["author"], book_data["chapters"])
                pdf.output(file_path)

                db.add(models.Book(
                    title=book_data["title"],
                    author=book_data["author"],
                    description=book_data["description"],
                    category=book_data["category"],
                    format="pdf",
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                ))

            db.commit()
            print(f"Created {len(SAMPLE_BOOKS)} sample books")
        else:
            print("Books already exist, skipping seed")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
