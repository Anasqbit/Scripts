import tkinter as tk
from tkinter import messagebox
import shutil
import os

# مسار اللعبة وملفات النسخ الاحتياطي
GAME_DLL = r"D:\steamm\steamapps\common\Hollow Knight\hollow_knight_Data\Managed\Assembly-CSharp.dll"
BACKUP_FOLDER = r"D:\steamm\steamapps\common\Hollow Knight\Backup"

def replace_dll(file_name):
    source = os.path.join(BACKUP_FOLDER, file_name)
    if not os.path.exists(source):
        messagebox.showerror("خطأ", f"الملف {file_name} غير موجود في مجلد Backup.")
        return

    try:
        shutil.copy2(source, GAME_DLL)
        mode = "التعريب" if "ar" in file_name else "المود"
      
    except Exception as e:
        messagebox.showerror("خطأ", f"حدث خطأ أثناء النسخ:\n{e}")

def activate_arabic():
    replace_dll("Assembly-CSharp_ar.dll")

def activate_mod():
    replace_dll("Assembly-CSharp_mod.dll")

# إنشاء واجهة بسيطة
root = tk.Tk()
root.title("Hollow Knight Switcher")
root.geometry("350x200")
root.configure(bg="#1e1e1e")

label = tk.Label(root, text="تبديل بين ملفات اللعبة", fg="white", bg="#1e1e1e", font=("Segoe UI", 14))
label.pack(pady=15)

btn1 = tk.Button(root, text="تشغيل التعريب", bg="#3b82f6", fg="white", font=("Segoe UI", 12),
                 width=20, height=2, command=activate_arabic)
btn1.pack(pady=5)

btn2 = tk.Button(root, text="تشغيل المود", bg="#22c55e", fg="white", font=("Segoe UI", 12),
                 width=20, height=2, command=activate_mod)
btn2.pack(pady=5)

root.mainloop()
