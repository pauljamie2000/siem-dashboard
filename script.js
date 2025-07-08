document.addEventListener('DOMContentLoaded', function() {
  // Contact form
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Thank you for reaching out! We will get back to you soon.');
      form.reset();
    });
  }

  // Pricing Learn More buttons
  const learnMoreBtns = document.querySelectorAll('.learn-more-btn');
  learnMoreBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetId = btn.getAttribute('data-target');
      const option = btn.closest('.option');
      // Collapse all
      document.querySelectorAll('.option').forEach(opt => {
        if (opt !== option) opt.classList.remove('expanded');
      });
      // Toggle current
      option.classList.toggle('expanded');
    });
  });

  // FAQ collapsible
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(q => {
    q.addEventListener('click', function() {
      const item = q.closest('.faq-item');
      item.classList.toggle('open');
    });
  });

  // Animate services list (force reflow for animation)
  const servicesList = document.getElementById('services-list');
  if (servicesList) {
    Array.from(servicesList.children).forEach((li, i) => {
      li.style.animationDelay = (0.1 + i * 0.1) + 's';
    });
  }
}); 