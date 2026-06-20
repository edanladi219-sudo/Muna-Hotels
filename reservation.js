document.addEventListener('DOMContentLoaded', function() {
    const reserveBtn = document.getElementById('reserve-btn');
    const modal = document.getElementById('reservation-modal');
    const closeBtn = document.querySelector('.close');
    const form = document.getElementById('reservation-form');
    const message = document.getElementById('reservation-message');
    const roomDisplay = document.getElementById('room-display');

    // Room type - set per page
    const roomType = window.roomType || 'Standard Room';

    // CRITICAL FIX: Check BOTH hotel_rooms (Admin Lock) and room_occupancy (Guest Bookings)
    async function isRoomAvailable(roomNumber, roomId) {
        if (!window.supabaseClient) return false;
        try {
            // 1. Check if a guest has already occupied it (Guest Bookings)
            const { data: occData, error: occError } = await window.supabaseClient
                .from('room_occupancy')
                .select('is_occupied')
                .eq('room_id', roomId)
                .maybeSingle();
            
            if (occData && occData.is_occupied === true) {
                return { available: false, reason: 'This room is currently occupied by another guest.' };
            }

            // 2. Check if Admin has marked the room as unavailable (Maintenance/Lock)
            const { data: roomData, error: roomError } = await window.supabaseClient
                .from('hotel_rooms')
                .select('is_available')
                .eq('room_number', roomNumber)
                .maybeSingle();

            if (roomData && roomData.is_available === false) {
                return { available: false, reason: 'This room is currently locked by administration.' };
            }

            return { available: true };
        } catch (err) {
            console.error('Occupancy check error:', err);
            return { available: false, reason: 'Status check failed. Please try again.' };
        }
    }

    // Function to open modal for a specific room
    async function openRoomReservation(roomNumber) {
        // Auth Guard for reservation
        const user = await window.getCurrentUser();
        if (!user) {
            alert('You must be logged in to make a reservation.');
            window.location.href = window.location.origin + '/public/auth.html';
            return;
        }

        const roomId = `${roomType}-${roomNumber}`;

        // Check if room is occupied BEFORE opening modal
        const status = await isRoomAvailable(roomNumber, roomId);
        if (!status.available) {
            alert(`⚠️ ${status.reason}`);
            return;
        }

        // Display room number
        if (roomDisplay) {
            roomDisplay.value = `Room ${roomNumber}`;
        }

        // Store current room info globally for form submission
        window.currentRoomNumber = roomNumber;
        window.currentRoomId = roomId;

        modal.style.display = 'block';
    }

    // Open modal from global "Reserve [Type]" button (if it exists)
    if (reserveBtn) {
        reserveBtn.addEventListener('click', async function() {
            // Use the default room from URL params or first room
            const roomNumber = window.roomNumber || 'A01';
            await openRoomReservation(roomNumber);
        });
    }

    // Add click handlers to all individual room reserve buttons
    const roomReserveButtons = document.querySelectorAll('.room-reserve-btn');
    roomReserveButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const roomNumber = this.dataset.room;
            await openRoomReservation(roomNumber);
        });
    });

    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        form.reset();
        message.textContent = '';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            form.reset();
            message.textContent = '';
        }
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const roomNumber = window.currentRoomNumber;
        const roomId = window.currentRoomId;

        // CRITICAL: Re-check occupancy at submission time
        const status = await isRoomAvailable(roomNumber, roomId);
        if (!status.available) {
            message.textContent = `❌ ${status.reason}`;
            message.style.color = 'red';
            return;
        }

        // Check if user is logged in
        if (!window.supabaseClient) {
            message.textContent = '❌ System Error: Database not connected. Please refresh.';
            message.style.color = 'red';
            console.error('supabaseClient not found on window object.');
            return;
        }

        const user = await window.getCurrentUser();
        if (!user) {
            message.textContent = 'Please log in first to make a reservation.';
            message.style.color = 'red';
            return;
        }

        const fullName = document.getElementById('full-name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const checkIn = document.getElementById('check-in').value;
        const checkOut = document.getElementById('check-out').value;
        const guests = document.getElementById('guests').value;

        message.textContent = '⌛ Processing your reservation...';
        message.style.color = 'blue';

        try {
            // 1. Save to Supabase (Database)
            const { data, error } = await window.supabaseClient
                .from('hotel_reservations')
                .insert([
                    {
                        user_id: user.id,
                        guest_name: fullName,
                        guest_email: email, // Admin JS might expect .email, check mapping below
                        guest_phone: phone, // Admin JS might expect .phone
                        room_number: roomNumber, // Previously missing
                        room_type: roomType,
                        check_in_date: checkIn,
                        check_out_date: checkOut,
                        number_of_guests: parseInt(guests),
                        status: 'pending',
                        created_at: new Date().toISOString() // Added timestamp
                    }
                ]);

            if (error) throw error;

            // 2. Mark room as occupied in Supabase
            const { error: occError } = await window.supabaseClient
                .from('room_occupancy')
                .upsert({ 
                    room_id: roomId, 
                    is_occupied: true, 
                    last_updated: new Date().toISOString() 
                });
            
            if (occError) console.error('Occupancy update error:', occError);

        } catch (err) {
            console.error('Reservation Error:', err);
            message.textContent = '❌ Failed to save: ' + (err.message || 'Unknown database error');
            message.style.color = 'red';
            return;
        }
        // Show success message
        message.style.color = 'green';
        message.textContent = '✓ Reservation submitted successfully!';

        // Close modal after a delay
        setTimeout(() => {
            modal.style.display = 'none';
            form.reset();
            message.textContent = '';
        }, 2000);
    });
});