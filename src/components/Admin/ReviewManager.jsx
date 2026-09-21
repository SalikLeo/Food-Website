import React, { useState, useMemo } from 'react';
import {
  Star,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquareHeart,
  Sparkles,
  Send,
  Filter,
  Check
} from 'lucide-react';
import { apiUrl } from '../../config/api';

export default function ReviewManager({ reviews = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null); // Review object to delete
  const [deleting, setDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New review form
  const [newReview, setNewReview] = useState({
    name: '',
    location: '',
    rating: 5,
    platform: 'Google Review',
    itemOrdered: '',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avgRating: '5.0', fiveStarCount: 0, fiveStarPct: 100 };

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStars = reviews.filter((r) => Number(r.rating) === 5).length;
    const pct = Math.round((fiveStars / total) * 100);

    return {
      total,
      avgRating: avg,
      fiveStarCount: fiveStars,
      fiveStarPct: pct
    };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const location = (r.location || '').toLowerCase();
      const item = (r.itemOrdered || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        location.includes(query) ||
        item.includes(query) ||
        comment.includes(query);

      const matchesRating =
        ratingFilter === 'all' ||
        (ratingFilter === '5' && Number(r.rating) === 5) ||
        (ratingFilter === '4' && Number(r.rating) === 4) ||
        (ratingFilter === '3' && Number(r.rating) <= 3);

      const matchesPlatform =
        platformFilter === 'all' ||
        (r.platform || '').toLowerCase().includes(platformFilter.toLowerCase());

      return matchesSearch && matchesRating && matchesPlatform;
    });
  }, [reviews, searchTerm, ratingFilter, platformFilter]);

  // Delete review handler
  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/reviews/${deleteTarget.id}`), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', `Review from "${deleteTarget.name}" deleted successfully.`);
        setDeleteTarget(null);
        if (onRefresh) onRefresh();
      } else {
        showNotification('error', data.error || 'Failed to delete review.');
      }
    } catch (err) {
      showNotification('error', 'Network error while deleting review.');
    } finally {
      setDeleting(false);
    }
  };

  // Add review handler
  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) {
      showNotification('error', 'Please enter customer name and review comment.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: newReview.name.trim(),
        location: newReview.location.trim() || 'Wah Cantt',
        rating: Number(newReview.rating) || 5,
        platform: newReview.platform || 'Customer Review',
        itemOrdered: newReview.itemOrdered.trim() || 'Special Meal',
        comment: newReview.comment.trim()
      };

      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'New review added and published to storefront!');
        setIsAddModalOpen(false);
        setNewReview({
          name: '',
          location: '',
          rating: 5,
          platform: 'Google Review',
          itemOrdered: '',
          comment: ''
        });
        if (onRefresh) onRefresh();
      } else {
        showNotification('error', data.error || 'Failed to add review.');
      }
    } catch (err) {
      showNotification('error', 'Network error while adding review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <span>Customer Reviews & Testimonials</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                Live Storefront Sync
              </span>
            </h2>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              Manage testimonials displayed on the homepage carousel and "View All Reviews" modal. You can delete spam/inappropriate feedback or manually post verified reviews.
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Review</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Total Reviews
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-zinc-900">{stats.total}</span>
            <span className="text-xs text-zinc-500">published</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Average Rating
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl font-bold text-amber-500">{stats.avgRating}</span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            5-Star Reviews
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-emerald-600">{stats.fiveStarCount}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.fiveStarPct}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Storefront Status
          </span>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-zinc-800">Auto Carousel Active</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, location, ordered meal, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Rating Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Stars' },
              { id: '5', label: '⭐ 5 Stars' },
              { id: '4', label: '⭐ 4 Stars' },
              { id: '3', label: '≤ 3 Stars' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRatingFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  ratingFilter === tab.id
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-orange-500 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Sources</option>
            <option value="Google">Google Reviews</option>
            <option value="Foodpanda">Foodpanda Verified</option>
            <option value="Customer">Storefront Customers</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
          <span>Showing {filteredReviews.length} of {reviews.length} total customer reviews</span>
          {(searchTerm || ratingFilter !== 'all' || platformFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRatingFilter('all');
                setPlatformFilter('all');
              }}
              className="text-orange-600 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-zinc-800 text-base">No Customer Reviews Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No reviews match the current filters. Try changing search keywords or resetting filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((review) => {
            const isDeletingThis = deleteTarget?.id === review.id;
            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        review.avatarBg || 'bg-orange-600'
                      } text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0`}
                    >
                      {review.avatar || (review.name ? review.name.slice(0, 2).toUpperCase() : 'MP')}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 leading-tight">
                        {review.name}
                      </h4>
                    </div>
                  </div>

                  {/* Actions & Rating */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(review)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete this review"
                      aria-label="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Comment */}
                <p className="text-xs text-zinc-700 leading-relaxed font-normal bg-zinc-50/60 p-3 rounded-xl border border-zinc-100">
                  "{review.comment}"
                </p>

                {/* Footer ID */}
                <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-100">
                  <span>ID: {review.id}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(review)}
                    className="text-red-500 hover:text-red-700 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Customer Review?</h3>
                <p className="text-xs text-zinc-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-zinc-800">
                <span>{deleteTarget.name}</span>
                <span className="text-amber-500">{'⭐'.repeat(deleteTarget.rating || 5)}</span>
              </div>
              <p className="text-zinc-600 italic">"{deleteTarget.comment}"</p>
            </div>

            <p className="text-xs text-zinc-500">
              Deleting this will immediately remove it from the storefront carousel and customer reviews modal.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteReview}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Review Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto py-8 animate-in fade-in duration-150"
          onClick={() => {
            if (!submitting) setIsAddModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Add Customer Review</h3>
                  <p className="text-xs text-zinc-500">
                    Publish verified feedback to the storefront carousel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddReview} className="space-y-4">
              {/* Rating */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">Rating</label>
                <select
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                  <option value="2">⭐⭐ (2 Stars)</option>
                  <option value="1">⭐ (1 Star)</option>
                </select>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">
                  Customer Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={newReview.name}
                  onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Comment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">
                  Review Comment <span className="text-orange-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Customer feedback on crust, taste, cheese, or delivery..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Publishing...' : 'Publish Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
