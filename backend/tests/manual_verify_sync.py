import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# MOCK GROQ to avoid import error
from unittest.mock import MagicMock
sys.modules['groq'] = MagicMock()

try:
    from services.action_executor import ActionExecutor
    print("Import successful.")

    executor = ActionExecutor()
    print("ActionExecutor instantiated.")

    if hasattr(executor, 'llm_generator'):
        print("LLMTerraformGenerator attached.")
    else:
        print("LLMTerraformGenerator MISSING.")

    if hasattr(executor, 'chat_persistence'):
        print("ChatPersistence attached.")
    else:
        print("ChatPersistence MISSING.")
    
    print("Verification passed!")

except Exception as e:
    print(f"Verification FAILED: {e}")
    import traceback
    traceback.print_exc()
