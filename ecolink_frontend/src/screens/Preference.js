import React, { useContext, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../colors';
import { ThemeContext } from '../contexts/ThemeContext';


const textColors = [
  colors.text,        
  colors.blue,        
  colors.purple,      
  colors.pink,        
  colors.green        
];

const backgrounds = [
  colors.background,
  colors.white,
  colors.lightGray,
  colors.lightBlue,
  colors.yellow
];

const Preference = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const navigation = useNavigation();

  // 저장 버튼 클릭 시 Profile로 이동
  const handleSave = () => {
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({ 
      headerRight: () => (
        <TouchableOpacity style={{marginRight: 16 }} onPress={handleSave}>
          <Text style={{ color: colors.darkBlue, fontSize: 16, fontWeight: 'bold' }}>저장</Text>
        </TouchableOpacity>
      ),
      title: '환경설정',
      headerTitleStyle: { fontWeight: 'bold' },
    });
  }, [navigation, handleSave]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.title, { color: theme.textColor, fontSize: theme.fontSize + 4 }]}>
        예시
      </Text>

      {/* 글자 크기 */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.label}>글자 크기</Text>
          <View style={styles.row}>
            <Button title="-" onPress={() => setTheme(t => ({ ...t, fontSize: Math.max(12, t.fontSize - 2) }))} />
            <Text style={styles.value}>{theme.fontSize}</Text>
            <Button title="+" onPress={() => setTheme(t => ({ ...t, fontSize: Math.min(40, t.fontSize + 2) }))} />
          </View>
        </View>
      </View>

      {/* 글자 색상 */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.label}>글자 색상</Text>
          <View style={styles.row}>
            {textColors.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c, borderWidth: theme.textColor === c ? 2 : 0 }
                ]}
                onPress={() => setTheme(t => ({ ...t, textColor: c }))}
              />
            ))}
          </View>
        </View>
      </View>

      {/* 배경색 */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.label}>배경색</Text>
          <View style={styles.row}>
            {backgrounds.map(bg => (
              <TouchableOpacity
                key={bg}
                style={[
                  styles.bgCircle,
                  { backgroundColor: bg, borderWidth: theme.backgroundColor === bg ? 2 : 0 }
                ]}
                onPress={() => setTheme(t => ({ ...t, backgroundColor: bg }))}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 40 },
  title: { fontWeight: 'bold', marginBottom: 30 },
  section: { marginBottom: 30, width: '90%' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, marginBottom: 10, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 18, marginHorizontal: 15 },
  colorCircle: {
    width: 32, height: 32, borderRadius: 16, marginHorizontal: 6, borderColor: '#333'
  },
  bgCircle: {
    width: 32, height: 32, borderRadius: 16, marginHorizontal: 6, borderColor: '#333'
  },
});

export default Preference;