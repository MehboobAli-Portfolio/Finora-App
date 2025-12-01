import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { ToastAndroid } from 'react-native';


const showToast = (message) => {
  ToastAndroid.show(message, ToastAndroid.Long);
};

const validateName = (name) => {
  if (name.length < 8) {
    showToast("Name must be at least 8 characters");
    return false;
  }
  return true;
};
const validateEmail = (email) => {
  if (!email.endsWith("@gmail.com")) {
    showToast("Email must end with @gmail.com");
    return false;
  }
  return true;
};
const validatePassword = (password) => {
  const uppercase = /[A-Z]/;
  const symbol = /[^A-Za-z0-9]/;

  if (password.length < 8) {
    showToast("Password must be at least 8 characters long");
    return false;
  }
  if (!uppercase.test(password)) {
    showToast("Password must contain at least 1 uppercase letter");
    return false;
  }
  if (!symbol.test(password)) {
    showToast("Password must contain at least 1 symbol");
    return false;
  }

  return true;
};
// handleModeChange needs access to component state setters; it will be
// defined inside the component below so it can call `setName`, `setEmail`,
// `setPassword` and `setHidePassword` without causing a reference error.
const AuthenticationScreen = () => {
  const [isLogin, setIsLogin] = useState(true); // State to track whether Login or Sign Up is selected
  const [emailFocused, setEmailFocused] = useState(false); // State to track focus of Email TextInput
  const [nameFocused, setNameFocused] = useState(false); // State to track focus of Name TextInput
  const [passwordFocused, setPasswordFocused] = useState(false); // State to track focus of Password TextInput
  const [rememberMe, setRememberMe] = useState(false); // State to track whether Remember Me is checked
  const [password, setPassword] = useState(''); // State to track password input
  const [hidePassword, setHidePassword] = useState(true); // State to track whether password is hidden
  const [name, setName] = useState(''); // State to track name input
  const [email, setEmail] = useState(''); // State to track email input

  // Reset input fields and restore password visibility when switching modes
  const handleModeChange = (mode) => {
    if(mode === 'signup') 
      setName('');
    setEmail('');
    setPassword('');
    setHidePassword(true);
  };


  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F7F9FC',
        alignItems: 'center',
        //justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 70,
      }}
    >
      <Image
        source={require('../assets/Images/finora_logo.png')}
        style={{
          width: 120,
          height: 120,
          resizeMode: 'contain'
        }}
      />
      {/* Toggle Buttons Container */}
      <View
        style={{
          marginTop: 20,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '90%',
          borderRadius: 70,
          padding: 4,
          backgroundColor: '#bab9baff',
          marginBottom: 25
        }}
      >
        {/* Login Button */}
        <TouchableOpacity
          onPress={() => { setIsLogin(true); 
            handleModeChange('login'); 
          }}
          style={{
            flex: 1,
            paddingVertical: 12,
            width: '90%',
            alignItems: 'center',
            borderRadius: 25,
            backgroundColor: isLogin ? '#ffffff' : 'transparent',
            elevation: isLogin ? 2 : 0,
            marginBottom: 2,
            marginTop: 2,
          }}
        >
          <Text style={{
            fontWeight: '600',
            color: isLogin ? '#000' : '#666'
          }}>
            Login
          </Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          onPress={() => { setIsLogin(false);
            handleModeChange('signup'); }}
          style={{
            flex: 1,
            paddingVertical: 12,
            width: '90%',
            alignItems: 'center',
            borderRadius: 25,
            backgroundColor: !isLogin ? '#ffffff' : 'transparent',
            elevation: !isLogin ? 2 : 0,
            marginBottom: 2,
            marginTop: 2,
          }}
        >
          <Text style={{
            fontWeight: '600',
            color: !isLogin ? '#000' : '#666'
          }}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          marginTop: 10,
          flexDirection: 'column',
          width: '90%',
        }}>
          {!isLogin && (
            <>
            <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#000000ff',
            }}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder='         Enter Your Name'
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={{
              height: 40,
              borderRadius: 25,
              borderWidth: 1,
              borderColor: 'gray',
              paddingHorizontal: 15, // horizontal padding
              paddingVertical: 8,    // vertical padding for placeholder centering
              marginBottom: 20,
              backgroundColor: '#fff',
              borderColor: nameFocused ? '#2f56c8ff' : '#9a9696ff', // blue on focus
            }}>
              
            </TextInput>
            </>  
        )}
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#000000ff',
          }}>
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder='📧    Your @email.com'
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          style={{
            height: 40,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'gray',
            paddingHorizontal: 15, // horizontal padding
            paddingVertical: 8,    // vertical padding for placeholder centering
            marginBottom: 20,
            backgroundColor: '#fff',
            borderColor: emailFocused ? '#2f56c8ff' : '#9a9696ff', // blue on focus
          }}>
        </TextInput>
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#000000ff',
          }}>
          Password
        </Text>
        <View style={{ position: 'relative', marginBottom: 20 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder='🔒    Enter your Password'
            secureTextEntry={hidePassword} // toggle password visibility
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            style={{
              height: 40,
              borderRadius: 25,
              borderWidth: 1,
              borderColor: passwordFocused ? '#2f56c8ff' : '#9a9696ff',
              paddingHorizontal: 15,
              paddingVertical: 8,
              backgroundColor: '#fff',
            }}
          />

          {/* Show/Hide toggle */}
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
            style={{ position: 'absolute', right: 15, top: 8 }}
          >
            <Text style={{ fontWeight: '600', color: '#2f56c8ff' }}>
              {hidePassword ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Remember Me + Forgot Password */}
      {isLogin && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            width: '90%',
          }}
        >
          {/* Custom Checkbox / Remember Me */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={{
                width: 20,
                height: 20,
                borderWidth: 1,
                borderColor: 'gray',
                backgroundColor: rememberMe ? '#2f56c8ff' : '#fff',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 4,
              }}
            >
              {rememberMe && <Text style={{ color: 'white', fontSize: 14 }}>✔</Text>}
            </TouchableOpacity>

            <Text style={{ marginLeft: 8 }}>Remember Me</Text>
          </View>

          {/* Flexible Spacer */}
          <View style={{ flex: 1 }} />

          {/* Forgot Password */}
          <TouchableOpacity>
            <Text style={{ color: 'blue', fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/*Login & SignUp button */}
      <TouchableOpacity
        onPress={() => {
          let valid = true;

          if (!isLogin) valid = validateName(name) && valid;
          valid = validateEmail(email) && valid;
          valid = validatePassword(password) && valid;
          if (!valid) return;
          showToast(isLogin ? "Logging in..." : "Signing up...");
        }}
        style={{
          marginTop: 20,
          width: '90%',
          backgroundColor: '#2563EB',
          paddingVertical: 12,
          borderRadius: 25,
        }}
      >
        <Text style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: '600',
          textAlign: 'center',
        }}>
          {isLogin ? 'Log In' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
      {/* Divider with text "or continue" */}
      <View
        style={{
          flexDirection: 'row', // Place line, text, line in a row
          alignItems: 'center',
          width: '90%',
          marginVertical: 20, // Space above and below
        }}
      >
        {/* Left Line */}
        <View
          style={{
            flex: 1, // Take remaining space
            height: 1, // Thin line
            backgroundColor: '#C4C4C4',
            width: '90%',
          }}
        />

        {/* Text in the middle */}
        <Text
          style={{
            marginHorizontal: 10, // Space on left and right of text
            color: '#6B7280',
            fontWeight: '600',
          }}
        >
          or continue
        </Text>

        {/* Right Line */}
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: '#C4C4C4',
          }}
        />
      </View>

      {/* Google Button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row', // Icon + text
          alignItems: 'center',
          justifyContent: 'center',
          width: '90%',
          paddingVertical: 12,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: '#C4C4C4',
          backgroundColor: '#fff',
          elevation: 2, // Optional shadow
        }}
        onPress={() => console.log('Google Login')}
      >
        {/* Google Logo */}
        <Image
          source={require('../assets/Images/Google_Logo.png')}
          style={{
            width: 20,
            height: 20,
            resizeMode: 'contain',
            marginRight: 10,
          }}
        />

        {/* Button Text */}
        <Text
          style={{
            color: '#000',
            fontWeight: '600',
            fontSize: 16,
          }}
        >
          Continue with Google
        </Text>
      </TouchableOpacity>


    </View>
  );
};

export default AuthenticationScreen;