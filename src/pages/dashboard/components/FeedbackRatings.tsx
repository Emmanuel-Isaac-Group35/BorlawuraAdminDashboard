import { useState } from 'react';

interface Feedback {
  id: string;
  type: 'rider' | 'service' | 'app';
  userName: string;
  userId: string;
  targetName?: string;
  targetId?: string;
  rating: number;
  comment: string;
  date: string;
  status: 'new' | 'reviewed' | 'resolved';
  category: 'positive' | 'neutral' | 'negative';
}

export default function FeedbackRatings() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const feedbacks: Feedback[] = [
    {
      id: 'FB-001',
      type: 'rider',
      userName: 'Kwame Asante',
      userId: 'U-1234',
      targetName: 'Kofi Adu',
      targetId: 'R-2847',
      rating: 5,
      comment: 'Excellent service! The rider was very professional and arrived on time. My waste was collected efficiently.',
      date: '2024-01-15 10:30 AM',
      status: 'reviewed',
      category: 'positive'
    },
    {
      id: 'FB-002',
      type: 'rider',
      userName: 'Ama Serwaa',
      userId: 'U-2345',
      targetName: 'Yaw Boateng',
      targetId: 'R-1523',
      rating: 2,
      comment: 'Rider was late by 45 minutes and did not notify me. Not satisfied with the service.',
      date: '2024-01-15 09:15 AM',
      status: 'new',
      category: 'negative'
    },
    {
      id: 'FB-003',
      type: 'service',
      userName: 'Kofi Mensah',
      userId: 'U-3456',
      rating: 4,
      comment: 'Good overall service. The app is easy to use and scheduling pickups is convenient.',
      date: '2024-01-14 03:20 PM',
      status: 'reviewed',
      category: 'positive'
    },
    {
      id: 'FB-004',
      type: 'app',
      userName: 'Abena Osei',
      userId: 'U-4567',
      rating: 3,
      comment: 'The app sometimes crashes when trying to schedule pickups. Please fix this issue.',
      date: '2024-01-14 11:45 AM',
      status: 'new',
      category: 'neutral'
    },
    {
      id: 'FB-005',
      type: 'rider',
      userName: 'Kwesi Appiah',
      userId: 'U-5678',
      targetName: 'Akua Mensah',
      targetId: 'R-3421',
      rating: 5,
      comment: 'Amazing service! Very friendly rider and thorough waste collection. Highly recommend!',
      date: '2024-01-13 02:10 PM',
      status: 'resolved',
      category: 'positive'
    },
    {
      id: 'FB-006',
      type: 'service',
      userName: 'Yaa Asantewaa',
      userId: 'U-6789',
      rating: 1,
      comment: 'Very disappointed. Scheduled pickup was missed twice without any notification. Poor customer service.',
      date: '2024-01-13 08:30 AM',
      status: 'new',
      category: 'negative'
    }
  ];

  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesType = filterType === 'all' || fb.type === filterType;
    const matchesCategory = filterCategory === 'all' || fb.category === filterCategory;
    return matchesType && matchesCategory;
  });

  const averageRating = (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(1);
  const positiveCount = feedbacks.filter(fb => fb.category === 'positive').length;
  const negativeCount = feedbacks.filter(fb => fb.category === 'negative').length;
  const newCount = feedbacks.filter(fb => fb.status === 'new').length;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`${i < rating ? 'ri-star-fill text-amber-400' : 'ri-star-line text-gray-300 dark:text-gray-600'}`}
      ></i>
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'reviewed':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'positive':
        return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10';
      case 'negative':
        return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10';
      case 'neutral':
        return 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const handleStatusChange = (feedbackId: string, newStatus: 'reviewed' | 'resolved') => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    toast.innerHTML = `
      <i class="ri-check-line text-lg"></i>
      <span class="font-medium">Feedback marked as ${newStatus}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback & Ratings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor customer satisfaction and service quality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Average Rating</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-star-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{averageRating}</p>
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {renderStars(Math.round(parseFloat(averageRating)))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Positive</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-thumb-up-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{positiveCount}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            {Math.round((positiveCount / feedbacks.length) * 100)}% satisfaction
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Negative</span>
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <i className="ri-thumb-down-line text-red-600 dark:text-red-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{negativeCount}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">Needs attention</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Pending Review</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <i className="ri-message-3-line text-blue-600 dark:text-blue-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{newCount}</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs text-blue-600 dark:text-blue-400">Requires action</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Feedback</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('rider')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'rider'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Rider Feedback
            </button>
            <button
              onClick={() => setFilterType('service')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'service'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Service Feedback
            </button>
            <button
              onClick={() => setFilterType('app')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'app'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              App Feedback
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('positive')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterCategory === 'positive'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Positive
            </button>
            <button
              onClick={() => setFilterCategory('negative')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterCategory === 'negative'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Negative
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {filteredFeedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className={`p-4 border-2 rounded-lg transition-all ${getCategoryColor(feedback.category)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <i className="ri-user-line text-teal-600 dark:text-teal-400"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{feedback.userName}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{feedback.userId}</p>
                    {feedback.targetName && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <i className="ri-arrow-right-line mr-1"></i>
                        Rider: {feedback.targetName} ({feedback.targetId})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                    {feedback.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 mb-2">
                {renderStars(feedback.rating)}
                <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{feedback.rating}.0</span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{feedback.comment}</p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  <i className="ri-time-line mr-1"></i>
                  {feedback.date}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFeedback(feedback)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    View Details
                  </button>
                  {feedback.status === 'new' && (
                    <button
                      onClick={() => handleStatusChange(feedback.id, 'reviewed')}
                      className="px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mark Reviewed
                    </button>
                  )}
                  {feedback.status === 'reviewed' && (
                    <button
                      onClick={() => handleStatusChange(feedback.id, 'resolved')}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback Details</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-gray-600 dark:text-gray-400"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <i className="ri-user-line text-teal-600 dark:text-teal-400 text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedFeedback.userName}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedFeedback.userId}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFeedback.status)}`}>
                      {selectedFeedback.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selectedFeedback.date}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(selectedFeedback.rating)}
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedFeedback.rating}.0 / 5.0</span>
                </div>
              </div>

              {selectedFeedback.targetName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Regarding</p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Rider: {selectedFeedback.targetName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedFeedback.targetId}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Comment</p>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedFeedback.comment}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedFeedback.status === 'new' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedFeedback.id, 'reviewed');
                      setSelectedFeedback(null);
                    }}
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Mark as Reviewed
                  </button>
                )}
                {selectedFeedback.status === 'reviewed' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedFeedback.id, 'resolved');
                      setSelectedFeedback(null);
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
