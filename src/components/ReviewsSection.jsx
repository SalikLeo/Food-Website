import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Quote,
  CheckCircle,
  ExternalLink,
  X,
  MessageSquareHeart,
  Sparkles,
  PlusCircle,
  Send,
  Check
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiUrl } from '../config/api';
import { notifyCustomerReviewSubmitted } from '../services/notificationService';

const REVIEWS_DATA = [
  {
    id: 1,
    name: 'Usman Tariq',
    location: 'Wah Model Town Phase 1',
    platform: 'Google Review',
    rating: 5,
    date: '2 days ago',
    avatar: 'UT',
    avatarBg: 'bg-amber-500',
    itemOrdered: 'Crown Crust Large Pizza',
    comment:
      'Hands down the best crown crust pizza in Wah Cantt! Cheese pull was insane and the crust was loaded with kabab pieces. Delivered piping hot in 30 minutes to Model Town Phase 1.'
  },
  {
    id: 2,
    name: 'Dr. Ayesha Siddiqui',
    location: 'Officers Colony, Wah Cantt',
    platform: 'Google Review',
    rating: 5,
    date: '1 week ago',
    avatar: 'AS',
    avatarBg: 'bg-orange-600',
    itemOrdered: 'Zinger Tower Burger & Wings',
    comment:
      'Their Zinger patty is so crispy and juicy, beats international brands in Wah. The garlic mayo sauce is top tier. Will definitely be our regular weekend family order!'
  },
  {
    id: 3,
    name: 'Hamza Malik',
    location: 'Aslam Market, Wah Cantt',
    platform: 'Foodpanda Verified',
    rating: 5,
    date: '3 days ago',
    avatar: 'HM',
    avatarBg: 'bg-red-600',
    itemOrdered: 'Deal 3: 2 Zinger + Large Pizza',
    comment:
      'Incredible value for money. Deal 3 easily fed four of us with plenty left over. Ordering directly on their website was super smooth and received instant WhatsApp confirmation.'
  },
  {
    id: 4,
    name: 'Zainab Bibi',
    location: 'Wah Model Town Phase 2',
    platform: 'Google Review',
    rating: 5,
    date: '5 days ago',
    avatar: 'ZB',
    avatarBg: 'bg-emerald-600',
    itemOrdered: 'Special Chicken Shawarma Platter',
    comment:
      'Best shawarma in town! Proper pita bread, packed with grilled chicken and pickling veggies without too much oily mayo. Fresh, clean, and delivered fast.'
  },
  {
    id: 5,
    name: 'Bilal Ahmed',
    location: 'Barrier 3, Wah Cantt',
    platform: 'Foodpanda Verified',
    rating: 5,
    date: '1 week ago',
    avatar: 'BA',
    avatarBg: 'bg-blue-600',
    itemOrdered: 'Crispy Broast & Loaded Fries',
    comment:
      'Broast was super crunchy outside and tender inside, not oily at all. The loaded fries with melted cheese and chipotle sauce were fantastic. 10/10 recommended for Wah foodies.'
  },
  {
    id: 6,
    name: 'Sana Farooq',
    location: 'Lalarukh, Wah Cantt',
    platform: 'Google Review',
    rating: 5,
    date: '2 weeks ago',
    avatar: 'SF',
    avatarBg: 'bg-purple-600',
    itemOrdered: 'Malai Boti Pizza Large',
    comment:
      'If you like creamy, rich desi flavors on a pizza, their Malai Boti pizza is unbeatable. Soft crust, generous chicken chunks, and arrived steam-hot. Customer service is 10/10!'
  },
  {
    id: 7,
    name: 'Naveed Akhtar',
    location: 'New City Phase 2',
    platform: 'Google Review',
    rating: 5,
    date: '3 weeks ago',
    avatar: 'NA',
    avatarBg: 'bg-teal-600',
    itemOrdered: 'Mega Feast Family Deal',
    comment:
      'Ordered for a family get-together. Everything from the pizzas to the burgers and fries was fresh and perfectly packed. Very courteous delivery rider.'
  },
  {
    id: 8,
    name: 'Kashif Mehmood',
    location: 'Wah Model Town Phase 1',
    platform: 'Google Review',
    rating: 5,
    date: '1 month ago',
    avatar: 'KM',
    avatarBg: 'bg-rose-600',
    itemOrdered: 'Pepperoni Supreme Pizza',
    comment:
      'Authentic taste and fresh dough made daily. Salik Fast Food has become our go-to late night hunger spot in Wah. Keep up the high standard!'
  }
];

export default function ReviewsSection() {
  const [reviews, setReviews] = useState(REVIEWS_DATA);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const CLONE_COUNT = Math.max(itemsPerPage, 3);
  const [currentIndex, setCurrentIndex] = useState(3);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const timerRef = useRef(null);

  const [isAllReviewsModalOpen, setIsAllReviewsModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState('all');

  // Add Review Form State
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    name: '',
    rating: 5,
    comment: ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState('');

  // Fetch reviews on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(apiUrl('/api/reviews'));
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data);
        }
      } catch (err) {
        console.error('Error fetching customer reviews:', err);
      }
    };
    fetchReviews();
  }, []);

  // Determine items per page dynamically (1 mobile, 2 tablet, 3 desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extended reviews array for infinite seamless wrap-around without scroll-back
  const extendedReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    if (reviews.length <= itemsPerPage) return reviews;
    let base = [...reviews];
    while (base.length < CLONE_COUNT) {
      base = [...base, ...reviews];
    }
    const leading = base.slice(-CLONE_COUNT);
    const trailing = base.slice(0, CLONE_COUNT);
    return [...leading, ...reviews, ...trailing];
  }, [reviews, itemsPerPage, CLONE_COUNT]);

  const handlePrev = () => {
    if (!reviews || reviews.length <= itemsPerPage) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!reviews || reviews.length <= itemsPerPage) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  // Seamless jump when reaching clones (removes the odd all-reviews-scroll-back glitch)
  const handleTransitionEnd = () => {
    if (!reviews || reviews.length <= itemsPerPage) return;
    if (currentIndex >= CLONE_COUNT + reviews.length) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - reviews.length);
    } else if (currentIndex < CLONE_COUNT) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + reviews.length);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  // Click and drag mouse / touch handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0 || reviews.length <= itemsPerPage) return;
    setIsPaused(true);
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0 || reviews.length <= itemsPerPage) return;
    setIsPaused(true);
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartXRef.current = e.touches[0].clientX;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || !e.touches || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - dragStartXRef.current;
    dragOffsetRef.current = diff;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsTransitioning(true);

    const diff = dragOffsetRef.current;
    const threshold = 40;
    if (diff < -threshold) {
      setCurrentIndex((prev) => prev + 1);
    } else if (diff > threshold) {
      setCurrentIndex((prev) => prev - 1);
    }
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setTimeout(() => setIsPaused(false), 2500);
  };

  // Global mouse release listener so dragging outside bounds finishes smoothly
  useEffect(() => {
    const onWindowMouseMove = (e) => {
      if (isDraggingRef.current) {
        const diff = e.clientX - dragStartXRef.current;
        dragOffsetRef.current = diff;
        setDragOffset(diff);
      }
    };

    const onWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setIsTransitioning(true);

        const diff = dragOffsetRef.current;
        const threshold = 40;
        if (diff < -threshold) {
          setCurrentIndex((prev) => prev + 1);
        } else if (diff > threshold) {
          setCurrentIndex((prev) => prev - 1);
        }
        setDragOffset(0);
        dragOffsetRef.current = 0;
        setTimeout(() => setIsPaused(false), 2500);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [reviews.length, itemsPerPage]);

  // Auto-slide carousel every 5s if not paused / dragging
  useEffect(() => {
    if (isPaused || isDragging || !reviews || reviews.length <= itemsPerPage) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isDragging, reviews.length, itemsPerPage]);

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (isAllReviewsModalOpen || isAddReviewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAllReviewsModalOpen, isAddReviewModalOpen]);

  const handleReviewSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newReview.name.trim()) {
      setReviewSubmitError('Please enter your name.');
      return;
    }
    if (!newReview.comment.trim()) {
      setReviewSubmitError('Please enter your review feedback.');
      return;
    }

    setSubmittingReview(true);
    setReviewSubmitError('');

    try {
      const payload = {
        name: newReview.name.trim(),
        rating: Number(newReview.rating) || 5,
        comment: newReview.comment.trim()
      };

      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success && data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setReviewSubmitSuccess(true);
        notifyCustomerReviewSubmitted(data.review || payload);
        setNewReview({
          name: '',
          rating: 5,
          comment: ''
        });
        setTimeout(() => {
          setReviewSubmitSuccess(false);
          setIsAddReviewModalOpen(false);
        }, 2000);
      } else {
        setReviewSubmitError(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewSubmitError('Network connection error. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeDot = reviews.length > 0
    ? ((currentIndex - CLONE_COUNT) % reviews.length + reviews.length) % reviews.length
    : 0;

  const filteredModalReviews = reviews.filter((r) => {
    if (modalFilter === '5') return r.rating === 5;
    if (modalFilter === '4') return r.rating === 4;
    return true;
  });

  return (
    <section
      id="reviews"
      className="relative py-20 lg:py-28 bg-[#0f0f10] overflow-hidden border-t border-zinc-800/80"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[450px] h-[450px] bg-amber-500/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>LOVED LOCALLY • OVER 1,200+ REVIEWS</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight text-white leading-none">
              CUSTOMER <span className="text-gradient-orange">REVIEWS.</span>
            </h2>

            <p className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
              Real feedback from food lovers across Wah Cantt & Wah Model Town. See why families choose Salik Fast Food every single day.
            </p>
          </div>

          {/* Aggregate Rating Badge & Carousel Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-zinc-300 font-bold mt-0.5">
                  4.8 / 5.0 Star Rating
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-right">
                <span className="text-xs font-bold text-white block">99.4%</span>
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Satisfied</span>
              </div>
            </div>

            {/* Desktop / Tablet Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous review"
                className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-orange-600 active:scale-95 text-zinc-300 hover:text-white border border-zinc-800 hover:border-orange-500 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next review"
                className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-orange-600 active:scale-95 text-zinc-300 hover:text-white border border-zinc-800 hover:border-orange-500 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Container with Click & Drag */}
        <div
          className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            if (!isDragging) setIsPaused(false);
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex"
            style={{
              transform: reviews.length <= itemsPerPage
                ? 'translateX(0%)'
                : `translateX(calc(-${currentIndex * (100 / itemsPerPage)}% + ${dragOffset}px))`,
              transition: isTransitioning && !isDragging
                ? 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)'
                : 'none'
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedReviews.map((review, idx) => (
              <div
                key={`${review.id}-clone-${idx}`}
                className="w-full sm:w-1/2 lg:w-1/3 flex-shrink-0 px-2.5 sm:px-3"
              >
                <div className="h-full bg-[#151518]/90 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-zinc-800 hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between group shadow-xl hover:-translate-y-1">
                  
                  {/* Top row: Stars */}
                  <div>
                    <div className="flex items-center gap-1 text-amber-400 mb-4">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>

                    {/* Comment text with quote symbol */}
                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Customer info footer */}
                  <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${review.avatarBg || 'bg-orange-600'} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-md`}
                      >
                        {review.avatar || (review.name ? review.name.slice(0, 2).toUpperCase() : 'MP')}
                      </div>
                      <span className="font-bold text-sm text-white leading-tight group-hover:text-orange-400 transition-colors">
                        {review.name}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Indicators & Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentIndex(CLONE_COUNT + i);
                }}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  activeDot === i
                    ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500'
                    : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons: Add Review + View All */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsAddReviewModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-950/40 hover:scale-[1.02] active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>+ Write a Review</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAllReviewsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer group"
            >
              <MessageSquareHeart className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              <span>View All Verified Reviews ({reviews.length})</span>
            </button>
          </div>
        </div>

      </div>

      {/* 1. View All Reviews Modal */}
      {isAllReviewsModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-6 sm:py-10 animate-in fade-in duration-150"
            onClick={() => setIsAllReviewsModalOpen(false)}
          >
            <div
              className="bg-[#141417] text-white rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl border border-zinc-800 space-y-6 my-auto animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-white">
                      Verified Customer Reviews
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      ⭐ 4.8 / 5.0
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Authentic feedback from Wah Cantt food lovers & delivery customers.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllReviewsModalOpen(false);
                      setIsAddReviewModalOpen(true);
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Write Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAllReviewsModalOpen(false)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Close reviews modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: `All Reviews (${reviews.length})` },
                  { id: '5', label: '⭐ 5 Stars' },
                  { id: '4', label: '⭐ 4 Stars' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setModalFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      modalFilter === f.id
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Reviews List */}
              <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1 custom-dropdown-scroll">
                {filteredModalReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${review.avatarBg || 'bg-orange-600'} text-white font-bold text-xs flex items-center justify-center flex-shrink-0`}
                        >
                          {review.avatar || (review.name ? review.name.slice(0, 2).toUpperCase() : 'MP')}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white block">
                            {review.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(review.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal">
                      "{review.comment}"
                    </p>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Showing {filteredModalReviews.length} of {reviews.length} verified reviews
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllReviewsModalOpen(false);
                      setIsAddReviewModalOpen(true);
                    }}
                    className="sm:hidden px-3.5 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Write Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllReviewsModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. Customer Write a Review Modal */}
      {isAddReviewModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto pt-6 pb-6 sm:py-10 animate-in fade-in duration-150"
            onClick={() => {
              if (!submittingReview) setIsAddReviewModalOpen(false);
            }}
          >
            <div
              className="bg-[#141417] text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-800 space-y-6 my-auto animate-in zoom-in-95 duration-150 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Your Voice Matters</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-white">
                    Write a Review
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Share your experience with Salik Fast Food. Wah Cantt food lovers love authentic recommendations!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(false)}
                  disabled={submittingReview}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close add review modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alerts */}
              {reviewSubmitSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Thank you! Your review has been submitted and is now live on our website!</span>
                </div>
              )}

              {reviewSubmitError && (
                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>{reviewSubmitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Rating Selector */}
                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/80 space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Overall Rating
                  </label>
                  <div
                    className="flex items-center gap-2"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = (hoverRating || newReview.rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="p-1 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                              isActive
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-zinc-600 hover:text-zinc-500'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-bold text-amber-400 ml-2 transition-all duration-150">
                      {(hoverRating || newReview.rating) === 5 && '⭐⭐⭐⭐⭐ Outstanding (5.0)'}
                      {(hoverRating || newReview.rating) === 4 && '⭐⭐⭐⭐ Very Good (4.0)'}
                      {(hoverRating || newReview.rating) === 3 && '⭐⭐⭐ Good (3.0)'}
                      {(hoverRating || newReview.rating) === 2 && '⭐⭐ Fair (2.0)'}
                      {(hoverRating || newReview.rating) === 1 && '⭐ Poor (1.0)'}
                    </span>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Your Full Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Farhan Ali"
                    value={newReview.name}
                    onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Your Review & Experience <span className="text-orange-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="How was the food, crust, taste, and delivery speed? Tell the community..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddReviewModalOpen(false)}
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? 'Submitting...' : 'Post Review'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
