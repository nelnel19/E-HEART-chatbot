# gemini_service.py
import google.generativeai as genai
import os
import time
from dotenv import load_dotenv
import google.api_core.exceptions

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables")

# Configure with timeout settings
try:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured successfully")
    
    # List available models
    print("Fetching available models...")
    models = list(genai.list_models())
    
    # Print all available models for debugging
    print("\nAvailable models:")
    available_model_names = []
    for model in models:
        print(f" - {model.name}")
        available_model_names.append(model.name)
    
    # Find the best available model
    AVAILABLE_MODEL = None
    
    # Priority list of model names (without 'models/' prefix)
    priority_models = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-pro',
        'gemini-pro-latest',
    ]
    
    # Check each priority model
    for priority in priority_models:
        # Try with and without 'models/' prefix
        if f'models/{priority}' in available_model_names:
            AVAILABLE_MODEL = f'models/{priority}'
            print(f"✓ Found priority model: {AVAILABLE_MODEL}")
            break
        elif priority in available_model_names:
            AVAILABLE_MODEL = priority
            print(f"✓ Found priority model: {AVAILABLE_MODEL}")
            break
    
    # If no priority model found, try to find any flash or pro model
    if not AVAILABLE_MODEL:
        for model in models:
            if 'flash' in model.name.lower() or 'pro' in model.name.lower():
                AVAILABLE_MODEL = model.name
                print(f"✓ Selected fallback model: {AVAILABLE_MODEL}")
                break
    
    # If still no model, use the first available
    if not AVAILABLE_MODEL and models:
        AVAILABLE_MODEL = models[0].name
        print(f"✓ Using first available model: {AVAILABLE_MODEL}")
    
    if AVAILABLE_MODEL:
        print(f"\n✅ Final selected model: {AVAILABLE_MODEL}")
    else:
        print("\n❌ No models available!")
    
    # Generation config optimized for speed but complete responses
    generation_config = {
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 2048,
        "candidate_count": 1,
    }
    
    # Cache for model instance
    _model_instance = None
    
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    AVAILABLE_MODEL = None

def get_model():
    """Get or create model instance (cached for performance)"""
    global _model_instance
    if _model_instance is None and AVAILABLE_MODEL:
        try:
            _model_instance = genai.GenerativeModel(AVAILABLE_MODEL)
            print(f"✓ Model instance created for: {AVAILABLE_MODEL}")
        except Exception as e:
            print(f"Error creating model instance: {e}")
            return None
    return _model_instance

def generate_response(prompt):
    """
    Generate response using Gemini API with optimized settings
    """
    if not AVAILABLE_MODEL:
        return "API configuration error. Please check server logs."
    
    try:
        print(f"\n--- Generating response ---")
        print(f"Prompt: {prompt[:100]}...")
        
        start_time = time.time()
        
        # Get cached model instance
        model = get_model()
        
        if not model:
            return "Model not available. Please try again."
        
        # Generate content with timeout
        try:
            # Add context for PRULIFE UK
            contextual_prompt = f"""You are a helpful assistant for PRULIFE UK, an insurance company. 
            Provide accurate, helpful information about insurance products, claims, and services.
            
            User question: {prompt}
            
            Provide a helpful response:"""
            
            response = model.generate_content(
                contextual_prompt,
                generation_config=generation_config,
                safety_settings={
                    'HATE': 'BLOCK_NONE',
                    'HARASSMENT': 'BLOCK_NONE',
                    'SEXUAL': 'BLOCK_NONE',
                    'DANGEROUS': 'BLOCK_NONE'
                }
            )
            
            elapsed_time = time.time() - start_time
            print(f"✓ Response received in {elapsed_time:.2f}s")
            
            if response and hasattr(response, 'text') and response.text:
                response_text = response.text
                print(f"Response length: {len(response_text)} characters")
                print(f"Response preview: {response_text[:150]}...")
                
                return response_text
            else:
                return "I received an empty response. Please try again."
                
        except google.api_core.exceptions.DeadlineExceeded:
            print("✗ Request timeout")
            return "The request took too long. Please try again with a shorter question."
        except google.api_core.exceptions.PermissionDenied:
            print("✗ Permission denied - check API key")
            return "API key error. Please check your configuration."
        except google.api_core.exceptions.ResourceExhausted:
            print("✗ Resource exhausted - quota exceeded")
            return "Service quota exceeded. Please try again later."
        except Exception as e:
            print(f"✗ Generation error: {type(e).__name__}: {e}")
            
            # Try fallback with different model if available
            try:
                print("Attempting fallback with different model...")
                # Try a simpler approach
                fallback_model = genai.GenerativeModel('gemini-pro')
                response = fallback_model.generate_content(prompt)
                if response and response.text:
                    return response.text
            except:
                pass
            
            return "I'm having trouble connecting. Please try again."
        
    except Exception as e:
        print(f"✗ Critical error: {type(e).__name__}: {e}")
        return "Service error. Please try again."

def test_gemini_connection():
    """Test Gemini connection"""
    print("\n" + "="*50)
    print("TESTING GEMINI CONNECTION")
    print("="*50)
    
    try:
        # Test simple generation
        test_prompt = "Say 'Hello, I am working properly!' in one sentence."
        response = generate_response(test_prompt)
        print(f"Test response: {response}")
        
        if response and "error" not in response.lower() and "trouble" not in response.lower():
            print("✅ Gemini connection successful")
            return True
        else:
            print("❌ Gemini connection failed")
            return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

# Run test on module load
if __name__ == "__main__":
    test_gemini_connection()
else:
    # Test connection when module is imported
    test_gemini_connection()