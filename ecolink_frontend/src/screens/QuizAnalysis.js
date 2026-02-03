import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../colors';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '../../firebaseConfig'; 


const { width, height } = Dimensions.get('window');

/**
 * QuizAnalysis : 오답 확인 + 분석석
 * 
 * TODO: 추후 API 연동 예정
 * - 각 단어별 실제 비디오 URL (썸네일 + 전체 영상)
 * - 단어의 실제 뜻/의미
 * - 수형 설명 데이터
 * 
 * 현재는 임시 데이터를 사용하되, API 연동을 위한 구조 준비 완료
 */

const QuizAnalysis = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // QuizScreen에서 전달받은 데이터
  const { quizData = [], userAnswers = [], score = 0 } = route.params || {};
  
  // 필터 상태
  const [selectedFilter, setSelectedFilter] = useState('전체');
  
  // 북마크 상태 관리
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
  
  // 비디오 모달 상태 관리
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

  //맞힌 갯수, 북마크 상태 저장하려고 상태 추가
  // const [isSaving, setIsSaving] = useState(false);

  // const saveQuizAnalysis = async () => {

  //   setIsSaving(true);
  //   try {
  //     const bookmarkedIndex = Array.from(bookmarkedQuestions);
  //     const bookmarkedQuestion = bookmarkedIndex.map(index => quizData[index]);
  //     const response = await fetch(`${REACT_APP_DJANGO_SERVER_URL}/api/quiz/userInfo/`, {
  //         method: 'POST',
  //         headers: {
  //             'Content-Type': 'application/json',
  //             },
  //         body: JSON.stringify({
  //             totalScore: score,
  //             bookmarkedQuestions: bookmarkedQuestion,
  //           })
  //         });
  //     if(response.ok){
  //       const backendResponse = await response.json(); 
  //       console.log('퀴즈 결과 저장 잘되었음: ', score, bookmarkedQuestion);
  //     } else {
  //       console.error('퀴즈 결과 저장 실패:', response.status);
  //     }


  //   }
  //   catch (error){
  //     console.error('네트워크 오류:', error);
  //     // Alert.alert('오류', '네트워크 연결 상태를 확인해주세요.');
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  const saveQuizResultToFirestore = async (score, bookmarkedQuestions, quizData) => {
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
  
      if (currentUser) {
        const db = getFirestore(app);
        
       // 북마크에서 전체 정보 x, url과 정답만 저장하도록 함함
        const bookmarkedQuestionDetails = Array.from(bookmarkedQuestions)
          .map(index => {
              const question = quizData[index];
              return {
                  url: question.url,
                  text: question.text,
              };
          });
        
        await addDoc(collection(db, "users", currentUser.uid,"userQuizHistory"), {
          totalScore: score,
          bookmarkedQuestions: bookmarkedQuestionDetails, // 필요한 정보만 담긴 배열 저장
          createdAt: serverTimestamp(),
        });
        
        console.log("Firestore에 퀴즈 결과(url, text) 저장 완료!");
      }
    } catch (e) {
      console.error("Firestore 저장 실패: ", e);
    }
  };
  
  // 필터 옵션
  const filterOptions = ['전체', '틀린 문제', '맞힌 문제', '북마크'];
  
  // 데이터 필터링
  const getFilteredData = () => {
    let filteredAnswers = userAnswers.map(answer => ({
      ...answer,
      // question: quizData[answer.questionIndex],
      isBookmarked: bookmarkedQuestions.has(answer.questionIndex)
    }));
    
    switch (selectedFilter) {
      case '틀린 문제':
        return filteredAnswers.filter(answer => !answer.isCorrect);
      case '맞힌 문제':
        return filteredAnswers.filter(answer => answer.isCorrect);
      case '북마크':
        return filteredAnswers.filter(answer => bookmarkedQuestions.has(answer.questionIndex));
      default:
        return filteredAnswers;
    }
  };
  
  const filteredData = getFilteredData();
  
  // 비디오 재생 처리
  const handleVideoPress = (questionIndex) => {
    // quizData 배열에서 해당 문제의 데이터를 찾고, 그 안의 url 필드에 접근
    const videoUrl = quizData[questionIndex]?.url;

    if (videoUrl) {
        setSelectedVideoUrl(videoUrl);
        setVideoModalVisible(true);
    } else {
        console.error("Video URL not found for question index:", questionIndex);
    }
};
  
  // 비디오 모달 닫기
  const closeVideoModal = () => {
    setVideoModalVisible(false);
    setSelectedVideoUrl(null);
  };
  
  // 북마크 토글
  const toggleBookmark = (questionIndex) => {
    setBookmarkedQuestions(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(questionIndex)) {
        newBookmarks.delete(questionIndex);
        console.log(`문제 ${questionIndex + 1} 북마크 해제`);
      } else {
        newBookmarks.add(questionIndex);
        console.log(`문제 ${questionIndex + 1} 북마크 추가`);
      }
      return newBookmarks;
    });
  };
  
  const renderQuizItem = ({ item, index }) => {
        const originalQuestion = quizData[item.questionIndex];
     
        if (!originalQuestion) {
          return null;
        }
    
        const questionNumber = item.questionIndex + 1;
        const isCorrect = item.isCorrect;
        const isBookmarked = item.isBookmarked;
    
      return (
         <View style={styles.quizItem}>
         {/* 왼쪽 비디오 영역 */}
              <TouchableOpacity 
                 style={styles.videoSection}
                  onPress={() => handleVideoPress(item.questionIndex)}
              >
              <Video
                  source={{ uri: originalQuestion.url }}
                  style={styles.videoThumbnail}
                        shouldPlay={false}
                        isLooping={false}
                        resizeMode="cover"
                    />
                  <View style={styles.playOverlay}>
                  <Text style={styles.playIcon}>▶</Text>
                     </View>
                </TouchableOpacity>
      
                {/* 오른쪽 내용 영역 */}
                <View style={styles.contentSection}>
                  <View style={styles.questionHeader}>
                      <Text style={styles.questionNumber}>{questionNumber.toString().padStart(2, '0')}.</Text>
                        <TouchableOpacity 
                          style={[
                            styles.bookmarkButton,
                            isBookmarked && styles.bookmarkedButton
                          ]}
                            onPress={() => toggleBookmark(item.questionIndex)}
                          >
                          <Text style={[
                            styles.bookmarkIcon,
                          isBookmarked && styles.bookmarkedIcon
                        ]}>
                        {isBookmarked ? '🏷️' : '🏷'}
                    </Text>
                      </TouchableOpacity>
                    </View>
    
                    <Text style={styles.questionTitle}>
                      {originalQuestion.text}
                     </Text>

                    <Text style={styles.handShapeDescription}>
                    
                    </Text>
       
                    <View style={styles.answerSection}>
                        <Text style={styles.answerText}>
                          선택한 답안: {item.selectedAnswerText}
                        </Text>
                        <Text style={[styles.answerText, isCorrect ? styles.correctAnswerText : styles.wrongAnswerText]}>
                          정답: {item.correctAnswerText}
                      </Text>
                  </View>
              </View>
          </View>
        );
    };

  // 뒤로가기 기능을 수행할 함수
  const handleGoBack = () => {
    saveQuizResultToFirestore(score, bookmarkedQuestions, quizData);
    navigation.navigate('QuizScreen', {
      updatedBookmarks: Array.from(bookmarkedQuestions),
    });
  };

    
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        {/* <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity> */}
        <Text style={styles.headerTitle}>Quiz</Text>
        {/* <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity> */}
      </View>
      
      {/* 필터 탭 */}
      <View style={styles.filterContainer}>
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter && styles.activeFilterText
            ]}>
              {filter}
              {filter === '북마크' && bookmarkedQuestions.size > 0 && 
                ` (${bookmarkedQuestions.size})`
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* 메인 컨텐츠 영역 */}
      <View style={styles.contentContainer}>
        {/* 퀴즈 리스트 */}
        <FlatList
          data={filteredData}
          renderItem={renderQuizItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
        />
        
        {/* 하단 버튼 */}
        <TouchableOpacity 
          style={styles.bottomButton}
          onPress={() => {
            saveQuizResultToFirestore(score, bookmarkedQuestions, quizData);
            navigation.navigate('Home')}
          }
        >
          <Text style={styles.bottomButtonText}>홈으로 가기</Text>
        </TouchableOpacity>
      </View>
      
      {/* 비디오 모달 */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeVideoModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            {selectedVideoUrl && (
              <Video
                source={{ uri: selectedVideoUrl }}
                style={styles.modalVideo}
                shouldPlay={true}
                isLooping={true}
                resizeMode="contain"
                useNativeControls={true}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // 헤더 스타일
  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingTop: 30,
    backgroundColor: colors.white,
    shadowColor: colors.gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.lightGray,
  },
  headerIcon: {
    fontSize: 24,
    color: colors.darkBlue,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkBlue,
  },
  searchIcon: {
    fontSize: 20,
    color: colors.darkBlue,
  },
  
  // 필터 탭 스타일
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
    backgroundColor: colors.white,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterTab: {
    backgroundColor: colors.darkBlue,
    borderColor: colors.darkBlue,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  
  // 리스트 스타일
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flatList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 10,
    paddingTop: 10,
  },
  quizItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    padding: 10,
    elevation: 2,
    shadowColor: colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    alignItems: 'center',
    minHeight: 80,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  // 비디오 섹션
  videoSection: {
    width: width * 0.22,
    height: 80,
    backgroundColor: colors.appleBlack,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.lightBlue,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 64, 175, 0.4)',
  },
  playIcon: {
    fontSize: 20,
    color: colors.white,
    textShadowColor: colors.darkBlue,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 내용 섹션
  contentSection: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    minHeight: 80,
    maxHeight: 100,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.orange,
    backgroundColor: colors.yellow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bookmarkButton: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: colors.lightGray,
  },
  bookmarkedButton: {
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.darkBlue,
  },
  bookmarkIcon: {
    fontSize: 14,
  },
  bookmarkedIcon: {
    color: colors.darkBlue,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.darkBlue,
    marginBottom: 2,
    numberOfLines: 1,
  },
  handShapeDescription: {
    fontSize: 10,
    color: colors.gray,
    marginBottom: 4,
    fontStyle: 'italic',
    backgroundColor: colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  answerSection: {
    marginTop: 2,
  },
  answerText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    numberOfLines: 1,
  },
  
  // 하단 버튼
  bottomButton: {
    backgroundColor: colors.darkBlue,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
    elevation: 4,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: colors.lightBlue,
  },
  bottomButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.6,
    backgroundColor: colors.white,
    borderRadius: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.lightBlue,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalVideo: {
    width: '90%',
    height: '90%',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.lightBlue,
  },
});

export default QuizAnalysis;
