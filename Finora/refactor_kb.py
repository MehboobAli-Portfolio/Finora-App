import os
import re

app_dir = r"d:\Finance App\Finora\app"

for root, dirs, files in os.walk(app_dir):
    for filename in files:
        if filename.endswith(".jsx"):
            path = os.path.join(root, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                
            if "KeyboardAvoidingView" not in content and "ScrollView" not in content:
                continue
                
            original_content = content
            
            # Add import
            if "react-native-keyboard-aware-scroll-view" not in content:
                if "import { router } from 'expo-router';" in content:
                    content = content.replace("import { router } from 'expo-router';", "import { router } from 'expo-router';\nimport { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';")
                else:
                    content = "import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';\n" + content
            
            # Strip behavior prop from KeyboardAvoidingView and rename to View
            content = re.sub(r'<KeyboardAvoidingView([^>]*)behavior=\{[^}]*\}([^>]*)>', r'<View\1\2>', content)
            
            # Fallback for any without behavior
            content = re.sub(r'<KeyboardAvoidingView([^>]*)>', r'<View\1>', content)
            content = content.replace('</KeyboardAvoidingView>', '</View>')
            
            # Replace ScrollView with KeyboardAwareScrollView
            content = content.replace('<ScrollView\n', '<KeyboardAwareScrollView\n')
            content = content.replace('<ScrollView ', '<KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} ')
            content = content.replace('</ScrollView>', '</KeyboardAwareScrollView>')
            
            if content != original_content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Refactored: {path}")
