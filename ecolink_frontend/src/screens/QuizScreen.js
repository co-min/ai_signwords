import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  ScrollView
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import colors from '../colors';
import { REACT_APP_DJANGO_SERVER_URL } from '@env';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '../../firebaseConfig'; 

const { width, height } = Dimensions.get('window');

const QuizScreen = () => {
  
  const navigation = useNavigation();
  const route = useRoute();
  
  // 상태 관리
  const [quizStarted, setQuizStarted] = useState(false); //퀴즈가 시작되었는지 여부
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]); // 사용자의 답안 기록
  const [options, setOptions] = useState([]);

  // 북마크 상태 관리하려고 상태 추가함함
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);

  // QuizAnalysis 화면에서 돌아올 때 북마크 상태를 업데이트
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.updatedBookmarks) {
        console.log('전달받은 북마크: ', route.params.updatedBookmarks);
        setBookmarkedQuestions(route.params.updatedBookmarks);
    
        navigation.setParams({ updatedBookmarks: undefined });
      }
    }, [route.params?.updatedBookmarks]) // route.params.updatedBookmarks가 변경될 때마다 실행
  );


  // 문제 데이터 준비
  const currentQuiz = quizData[currentQuestion];

  // 보기 배열 만들기 (정답+오답 섞기)
  function shuffle(array) {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  useEffect(() => {
    if (currentQuiz) {
      setOptions(shuffle([currentQuiz.text, ...currentQuiz.incorrectArr]));
    }
  }, [currentQuiz]);

  // 정답 인덱스 구하기
  const correctIndex = options.indexOf(currentQuiz?.text);

  // 샘플 퀴즈 데이터 (총 10문제)
  const sampleQuizData = [
    {
      id: 1,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['안녕하세요', '감사합니다', '죄송합니다', '사랑해요'],
      correctAnswer: 0
    },
    {
      id: 2,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['좋아요', '싫어요', '모르겠어요', '알겠어요'],
      correctAnswer: 1
    },
    {
      id: 3,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['학교', '집', '병원', '가게'],
      correctAnswer: 2
    },
    {
      id: 4,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['물', '음료수', '커피', '우유'],
      correctAnswer: 0
    },
    {
      id: 5,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['가족', '친구', '선생님', '의사'],
      correctAnswer: 3
    },
    {
      id: 6,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['먹다', '마시다', '자다', '일하다'],
      correctAnswer: 1
    },
    {
      id: 7,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['빨간색', '파란색', '노란색', '초록색'],
      correctAnswer: 2
    },
    {
      id: 8,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['어제', '오늘', '내일', '모레'],
      correctAnswer: 1
    },
    {
      id: 9,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['크다', '작다', '높다', '낮다'],
      correctAnswer: 0
    },
    {
      id: 10,
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      question: '위 수어 영상의 의미는 무엇인가요?',
      options: ['행복하다', '슬프다', '화나다', '놀라다'],
      correctAnswer: 0
    }
  ];


  // 백엔드에서 퀴즈 데이터 가져오기
  const fetchQuizData = async (folderName) => {
    setLoading(true);
    console.log('첫시작'); //
    try {
      const response = await fetch(`${REACT_APP_DJANGO_SERVER_URL}/api/quiz/random/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body : JSON.stringify({ folder: folderName})
      });

      if (response.ok) {
        const data = await response.json();
        console.log('백엔드에서 받아온 퀴즈 데이터:', data);
        setQuizData(data);
      } else {
        console.log('백엔드에서 퀴즈 데이터를 가져오는데 실패했습니다. 샘플 데이터를 사용합니다.');
        setQuizData(sampleQuizData);
      }
    } catch (error) {
      console.error('퀴즈 데이터 fetch 오류:', error);
      setQuizData(sampleQuizData); // 오류 시 샘플 데이터 사용
    } finally {
      setLoading(false);
    }
  };

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

  // 퀴즈 시작
  const startQuiz = async (folderName) => {
    await fetchQuizData(folderName);
    setQuizStarted(true);
    setQuizCompleted(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setUserAnswers([]);
  };

  // 답안 선택
  const selectAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  // 다음 문제로 이동
  const nextQuestion = () => {
    if (selectedAnswer === null) {
      Alert.alert('알림', '답을 선택해주세요.');
      return;
    }
    const currentQuiz = quizData[currentQuestion];
    const isCorrect = options[selectedAnswer] === currentQuiz.text; 


    // 사용자 답안 기록
    const newUserAnswers = [...userAnswers, {
      questionIndex: currentQuestion,
      selectedAnswerText: options[selectedAnswer], 
      correctAnswerText: currentQuiz.text, 
      isCorrect: isCorrect
    }];
    setUserAnswers(newUserAnswers);

    // 정답 체크
    if (isCorrect) {
      setScore(score + 1);
      // console.log('맞힌 갯수: ', count); //맞힌 갯수 확인
    }

    // 다음 문제 또는 결과 화면
    if (currentQuestion + 1 < quizData.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setVideoLoading(true);
    } else {
      // 퀴즈 완료
      setQuizCompleted(true);
    }
  };

  // 홈으로 가기
  const goToHome = () => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setUserAnswers([]);
    navigation.navigate('Home'); // 홈 화면으로 이동
  };

  // 오답 확인하기 화면으로 이동
  const checkWrongAnswers = () => {
    // QuizAnalysis 화면으로 이동하며 퀴즈 데이터와 사용자 답안을 전달
    navigation.navigate('QuizAnalysis', {
      quizData: quizData,
      userAnswers: userAnswers,
      options: options,
      initialBookmarks: bookmarkedQuestions, 
      score: score
    });
  };

  // 퀴즈 시작 전 화면
  const renderStartScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>퀴즈</Text>
        <View style={styles.headerButton} />
      </View>
      
      <View style={styles.startContainer}>
        <Text style={styles.title}>수어 퀴즈</Text>
        <Text style={styles.subtitle}>
          풀고싶은 퀴즈 분야를 선택하고 총 10문제의 수어 영상을 보고 정답을 맞춰보세요!
        </Text>
        <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => startQuiz('위급상황')}
        >
          <Text style={styles.startButtonText}>위급 상황</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => startQuiz('교육')}
        >
          <Text style={styles.startButtonText}>교육</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => startQuiz('나라명 및 지명')}
        >
          <Text style={styles.startButtonText}>나라명 및 지명 </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => startQuiz('동식물')}
        >
          <Text style={styles.startButtonText}>동식물</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );

  // 퀴즈 문제 화면
  const renderQuizScreen = () => {
    if (!quizData || quizData.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Text style={styles.headerIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>퀴즈</Text>
            <View style={styles.headerButton} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>퀴즈를 불러오는 중...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return currentQuiz ? (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.headerIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>퀴즈</Text>
          <View style={styles.headerButton} />
        </View>
        
        <View style={styles.quizContainer}>
          {/* 진행률 표시 */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestion + 1} / {quizData.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentQuestion + 1) / quizData.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          {/* 질문 */}
          <Text style={styles.questionText}>{`이 수어의 의미는 무엇인가요?`}</Text>
          
          {/* 비디오와 옵션을 묶는 가로 컨테이너 */}
          <View style={styles.videoAndOptionsRow}>
            {/* 수어 비디오 */}
            <View style={styles.videoContainer}>
              {videoLoading && (
                <View style={styles.videoLoadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.videoLoadingText}>비디오 로딩 중...</Text>
                </View>
              )}
              <Video
                source={{ uri: currentQuiz.url }}
                style={styles.video}
                shouldPlay={true}
                isLooping={true}
                resizeMode="contain"
                onLoadStart={() => setVideoLoading(true)}
                onLoad={() => setVideoLoading(false)}
                onError={(error) => {
                  console.error('비디오 로딩 오류:', error);
                  setVideoLoading(false);
                }}
              />
            </View>

            {/* 객관식 답안들 */}
            <ScrollView 
              style={styles.optionsContainer}
              contentContainerStyle={styles.optionsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {Array.isArray(options) && options.length > 0 ? (
                options.map((option, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      selectedAnswer === idx && styles.selectedOption
                    ]}
                    onPress={() => selectAnswer(idx)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedAnswer === idx && styles.selectedOptionText
                    ]}>
                      {String.fromCharCode(65 + idx)}. {option}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
            </ScrollView>
          </View>

          {/* 다음 버튼 */}
          <TouchableOpacity 
            style={[
              styles.nextButton,
              selectedAnswer === null && styles.disabledButton
            ]}
            onPress={nextQuestion}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestion + 1 === quizData.length ? '완료' : '다음'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    ) : (
      <ActivityIndicator />
    );
  };

  // 결과 화면
  const renderResultScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>퀴즈 결과</Text>
        <View style={styles.headerButton} />
      </View>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>퀴즈 완료!</Text>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>나의 점수는</Text>
          <Text style={styles.scoreNumber}>{score}/10</Text>
        </View>

        <View style={styles.resultButtonContainer}>
          <TouchableOpacity 
            style={styles.resultButton}
            onPress={checkWrongAnswers}
          >
            <Text style={styles.resultButtonText}>오답확인하기</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.resultButton, styles.homeButton]}
            onPress={() =>  {
              saveQuizResultToFirestore(score, bookmarkedQuestions, quizData);
              goToHome();
             
            }}
          >
            <Text style={[styles.resultButtonText, styles.homeButtonText]}>홈으로 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>퀴즈를 불러오는 중...</Text>
      </View>
    );
  }

  return quizCompleted ? renderResultScreen() : (quizStarted ? renderQuizScreen() : renderStartScreen());
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: colors.lightGray,
    paddingTop: 30,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  
  // 시작 화면 스타일
  startContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    backgroundColor: colors.background,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: colors.darkBlue,
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingRight: 20,
    width: '100%',
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // 로딩 화면 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.gray,
  },

  // 퀴즈 화면 스타일
  quizContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: colors.background,
  },
  
  // 진행률 표시
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.darkBlue,
    borderRadius: 4,
  },

  // 질문
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  
  //비디오와 옵션을 묶는 새로운 가로 컨테이너
  videoAndOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },

  // 비디오 컨테이너 스타일
  videoContainer: {
    width: '46%',
    height: '100%',
    backgroundColor: colors.appleBlack,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 20,
    marginRight: 40,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  videoLoadingText: {
    color: colors.white,
    marginTop: 10,
    fontSize: 14,
  },

  // 객관식 옵션들
  optionsContainer: {
    width: '48%',
  },
  optionsScrollContent: {
    paddingBottom: 5,
  },
  optionButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginRight: 20,
  },
  selectedOption: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.darkBlue,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: colors.darkBlue,
    fontWeight: 'bold',
  },

  // 다음 버튼
  nextButton: {
    backgroundColor: colors.darkBlue,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: colors.gray,
    elevation: 0,
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 결과 화면 스타일
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 40,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 60,
    backgroundColor: colors.white,
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  scoreText: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.darkBlue,
  },
  resultButtonContainer: {
    width: '100%',
    gap: 15,
  },
  resultButton: {
    backgroundColor: colors.darkBlue,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resultButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.darkBlue,
    elevation: 0,
    shadowOpacity: 0,
  },
  homeButtonText: {
    color: colors.darkBlue,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 30,
    width: '40%',
    textAlign: 'center',
  },
  startButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: colors.darkBlue,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 25,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuizScreen;