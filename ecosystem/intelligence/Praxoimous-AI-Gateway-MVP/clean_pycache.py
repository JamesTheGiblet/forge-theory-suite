# clean_pycache.py
import os
import shutil
from pathlib import Path

def delete_pycache(project_root_str: str = "."):
    """
    Recursively finds and deletes all __pycache__ directories and .pyc files
    within the specified project root directory.

    Args:
        project_root_str (str): The starting directory to scan. Defaults to the
                                current directory (".").
    """
    project_root = Path(project_root_str).resolve()
    deleted_folders_count = 0
    deleted_files_count = 0

    print(f"Scanning for __pycache__ directories and .pyc files in: {project_root}\n")

    # Use rglob to find all relevant directories and files
    pycache_dirs = list(project_root.rglob("__pycache__"))
    pyc_files = list(project_root.rglob("*.pyc"))

    for pycache_dir in pycache_dirs:
        if pycache_dir.is_dir():
            try:
                shutil.rmtree(pycache_dir)
                print(f"Deleted directory: {pycache_dir}")
                deleted_folders_count += 1
            except OSError as e:
                print(f"Error deleting directory {pycache_dir}: {e}")

    for pyc_file in pyc_files:
        if pyc_file.is_file():
            try:
                pyc_file.unlink()
                print(f"Deleted file: {pyc_file}")
                deleted_files_count += 1
            except OSError as e:
                print(f"Error deleting file {pyc_file}: {e}")

    print(f"\nCache cleaning complete.")
    print(f"Deleted {deleted_folders_count} __pycache__ folder(s).")
    print(f"Deleted {deleted_files_count} .pyc file(s).")

if __name__ == "__main__":
    delete_pycache()