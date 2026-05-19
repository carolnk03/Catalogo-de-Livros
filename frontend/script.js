class BookManager {
    constructor() {
        // Configuração da API
        this.API_URL = 'http://localhost:3000/api/books';
        this.useAPI = true; // Mudar para true quando o backend estiver rodando
        
        // Estado da aplicação
        this.books = [];
        this.currentFilter = 'all';
        this.currentGenreFilter = 'all';
        this.currentSort = 'newest';
        this.selectedRating = 0;
        this.isLoading = false;
        this.lastSearchTime = 0; // Controle de rate limit
        
        // Inicializar
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupStarsInput();
        this.setupDarkMode();
        await this.loadBooks();
        this.renderBooks();
        this.updateStats();
        
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 100);
    }

    // Carregamento de dados
    async loadBooks() {
        if (this.useAPI) {
            await this.loadBooksFromAPI();
        } else {
            this.loadBooksFromLocalStorage();
        }
    }

    loadBooksFromLocalStorage() {
        try {
            const savedBooks = localStorage.getItem('booksPro');
            this.books = savedBooks ? JSON.parse(savedBooks) : [];
            
            if (this.books.length === 0) {
                this.addSampleBooks();
            }
        } catch (error) {
            console.error('Erro ao carregar livros:', error);
            this.books = [];
            this.addSampleBooks();
        }
    }

    async loadBooksFromAPI() {
        try {
            this.showLoading(true);
            const response = await fetch(this.API_URL);
            if (!response.ok) throw new Error('Erro ao carregar livros');
            this.books = await response.json();
        } catch (error) {
            console.error('Erro ao carregar da API:', error);
            this.showToast('⚠️ Usando armazenamento local', 'warning');
            this.loadBooksFromLocalStorage();
        } finally {
            this.showLoading(false);
        }
    }

    addSampleBooks() {
        const sampleBooks = [
            {
                id: 1,
                title: "Dom Casmurro",
                author: "Machado de Assis",
                pages: 208,
                genre: "Drama",
                rating: 5,
                read: true,
                createdAt: "2024-01-15T10:00:00.000Z"
            },
            {
                id: 2,
                title: "1984",
                author: "George Orwell",
                pages: 328,
                genre: "Ficção Científica",
                rating: 4,
                read: false,
                createdAt: "2024-02-20T10:00:00.000Z"
            },
            {
                id: 3,
                title: "O Hobbit",
                author: "J.R.R. Tolkien",
                pages: 310,
                genre: "Fantasia",
                rating: 5,
                read: true,
                createdAt: "2024-03-10T10:00:00.000Z"
            }
        ];
        this.books = sampleBooks;
        this.saveBooks();
    }

    // Modo escuro
    setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;

        const icon = darkModeToggle.querySelector('i');
        
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.enableDarkMode(darkModeToggle, icon);
        }

        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            
            if (isDark) {
                this.disableDarkMode(darkModeToggle, icon);
            } else {
                this.enableDarkMode(darkModeToggle, icon);
            }
            this.animateButton(darkModeToggle);
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    this.enableDarkMode(darkModeToggle, icon);
                } else {
                    this.disableDarkMode(darkModeToggle, icon);
                }
            }
        });
    }

    enableDarkMode(toggle, icon) {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    }

    disableDarkMode(toggle, icon) {
        document.body.removeAttribute('data-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }

    animateButton(button) {
        button.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            button.style.transform = 'rotate(0deg) scale(1)';
        }, 300);
    }

    // SISTEMA DE ESTRELAS
    setupStarsInput() {
        const starsContainer = document.getElementById('starsInput');
        if (!starsContainer) return;

        const stars = starsContainer.querySelectorAll('i');
        const ratingInput = document.getElementById('rating');

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(stars, rating, 'hover');
            });

            star.addEventListener('mouseout', () => {
                this.highlightStars(stars, this.selectedRating, 'normal');
            });

            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                
                if (this.selectedRating === rating) {
                    this.selectedRating = 0;
                } else {
                    this.selectedRating = rating;
                }
                
                ratingInput.value = this.selectedRating;
                this.highlightStars(stars, this.selectedRating, 'selected');
                this.animateStars(stars);
            });
        });
    }

    highlightStars(stars, rating, mode = 'normal') {
        stars.forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            star.classList.remove('fas', 'far', 'active');
            
            if (starRating <= rating) {
                star.classList.add('fas', 'active');
                if (mode === 'hover') {
                    star.style.transform = 'scale(1.3)';
                } else {
                    star.style.transform = 'scale(1)';
                }
            } else {
                star.classList.add('far');
                star.style.transform = 'scale(1)';
            }
        });
    }

    animateStars(stars) {
        stars.forEach((star, index) => {
            setTimeout(() => {
                star.style.transform = 'scale(1.5)';
                setTimeout(() => {
                    star.style.transform = 'scale(1)';
                }, 150);
            }, index * 50);
        });
    }

    // EVENT LISTENERS
    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.searchBooks());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchBooks();
            });
        }

        const addBookForm = document.getElementById('addBookForm');
        if (addBookForm) {
            addBookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addBook();
            });
        }

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderBooks();
            });
        });

        const genreFilter = document.getElementById('genreFilter');
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                this.currentGenreFilter = e.target.value;
                this.renderBooks();
            });
        }

        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderBooks();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                searchInput?.focus();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                document.getElementById('title')?.focus();
            }
        });
    }

    // OPERAÇÕES CRUD
    async addBook() {
        const title = document.getElementById('title')?.value.trim();
        const author = document.getElementById('author')?.value.trim();
        const pages = parseInt(document.getElementById('pages')?.value) || 0;
        const genre = document.getElementById('genre')?.value;
        const rating = parseInt(document.getElementById('rating')?.value) || 0;

        if (!title || !author) {
            this.showToast('⚠️ Título e autor são obrigatórios!', 'error');
            this.shakeElement(document.getElementById('title') || document.getElementById('author'));
            return;
        }

        if (!genre) {
            this.showToast('⚠️ Selecione um gênero!', 'error');
            this.shakeElement(document.getElementById('genre'));
            return;
        }

        const book = {
            title,
            author,
            pages,
            genre,
            rating,
            read: false,
            createdAt: new Date().toISOString()
        };

        try {
            if (this.useAPI) {
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(book)
                });
                
                if (!response.ok) throw new Error('Erro ao adicionar livro');
                const newBook = await response.json();
                this.books.unshift(newBook);
            } else {
                book.id = Date.now();
                this.books.unshift(book);
                this.saveBooks();
            }

            this.resetForm();
            await this.renderBooks();
            this.updateStats();
            this.showToast('✅ Livro adicionado com sucesso!', 'success');
            
            setTimeout(() => {
                const firstBook = document.querySelector('.book-item');
                if (firstBook) {
                    firstBook.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstBook.style.animation = 'none';
                    firstBook.offsetHeight;
                    firstBook.style.animation = 'scaleIn 0.4s ease';
                }
            }, 300);

        } catch (error) {
            console.error('Erro ao adicionar livro:', error);
            this.showToast('😢 Erro ao adicionar livro!', 'error');
        }
    }

    async addFromAPI(title, author, pages, genre) {
        const book = {
            title: this.unescapeHtml(title),
            author: this.unescapeHtml(author),
            pages: pages || 0,
            genre: this.mapGenre(this.unescapeHtml(genre)),
            rating: 0,
            read: false,
            createdAt: new Date().toISOString()
        };

        try {
            if (this.useAPI) {
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(book)
                });
                
                if (!response.ok) throw new Error('Erro ao adicionar livro');
                const newBook = await response.json();
                this.books.unshift(newBook);
            } else {
                const exists = this.books.some(b => 
                    b.title.toLowerCase() === book.title.toLowerCase() &&
                    b.author.toLowerCase() === book.author.toLowerCase()
                );
                
                if (exists) {
                    this.showToast('⚠️ Este livro já está na sua biblioteca!', 'warning');
                    return;
                }
                
                book.id = Date.now();
                this.books.unshift(book);
                this.saveBooks();
            }

            await this.renderBooks();
            this.updateStats();
            this.showToast('✅ Livro adicionado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao adicionar livro da API:', error);
            this.showToast('😢 Erro ao adicionar livro!', 'error');
        }
    }

    // BUSCA NA API DO GOOGLE BOOKS
    async searchBooks() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput?.value.trim();
        
        if (!searchTerm) {
            this.showToast('⚠️ Digite um termo de busca!', 'warning');
            searchInput?.focus();
            return;
        }

        // CONTROLE DE RATE LIMIT - Evita erro 429
        const now = Date.now();
        const timeSinceLastSearch = now - this.lastSearchTime;
        if (timeSinceLastSearch < 2000) {
            const waitTime = 2000 - timeSinceLastSearch;
            this.showToast(`⏳ Aguarde ${Math.ceil(waitTime/1000)}s para buscar novamente...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastSearchTime = Date.now();

        const resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>🔍 Buscando "${searchTerm}"...</p>
            </div>
        `;

        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const response = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=8&langRestrict=pt`
            );
            
            console.log('📡 Status da resposta:', response.status);
            
            // Tratar erro 429 especificamente
            if (response.status === 429) {
                throw new Error('Muitas requisições! Aguarde 1 minuto antes de tentar novamente.');
            }
            
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="no-results animate-fade-in">
                        <i class="fas fa-search" style="font-size: 3em; color: var(--text-muted);"></i>
                        <p>😕 Nenhum livro encontrado para "${searchTerm}"</p>
                        <p style="color: var(--text-muted);">Tente outros termos de busca</p>
                    </div>
                `;
                return;
            }

            resultsDiv.innerHTML = data.items.map((book, index) => {
                const volumeInfo = book.volumeInfo;
                const title = volumeInfo.title || 'Título desconhecido';
                const author = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido';
                const pages = volumeInfo.pageCount || 0;
                const genre = volumeInfo.categories ? volumeInfo.categories[0] : 'Outro';
                const thumbnail = volumeInfo.imageLinks?.thumbnail || '';
                const description = volumeInfo.description ? 
                    volumeInfo.description.substring(0, 100) + '...' : 
                    'Sem descrição disponível';

                return `
                    <div class="book-card result-card animate-slide-up" style="animation-delay: ${index * 0.1}s">
                        ${thumbnail ? `<img src="${thumbnail}" alt="${this.escapeHtml(title)}" class="book-thumbnail">` : ''}
                        <div class="book-info">
                            <h3 title="${this.escapeHtml(title)}">${this.truncateText(title, 50)}</h3>
                            <p class="author-result"><i class="fas fa-user"></i> ${this.truncateText(author, 30)}</p>
                            <p class="pages-result"><i class="fas fa-book"></i> ${pages} páginas</p>
                            <p class="genre-result"><i class="fas fa-tag"></i> ${genre}</p>
                            <p class="description-result" title="${volumeInfo.description || ''}">${description}</p>
                        </div>
                        <button class="add-btn" onclick="bookManager.addFromAPI('${this.escapeHtml(title)}', '${this.escapeHtml(author)}', ${pages}, '${this.escapeHtml(genre)}')">
                            <i class="fas fa-plus"></i> Adicionar à Biblioteca
                        </button>
                    </div>
                `;
            }).join('');

            console.log('✅ Livros encontrados e exibidos!');

        } catch (error) {
            console.error('❌ Erro na busca:', error);
            resultsDiv.innerHTML = `
                <div class="error-message animate-fade-in">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>😢 Erro ao buscar livros</p>
                    <p style="color: var(--text-muted); font-size: 0.9em;">${error.message}</p>
                    <p style="color: var(--text-muted); font-size: 0.8em; margin-top: 5px;">
                        Dica: Aguarde 1 minuto e tente novamente
                    </p>
                </div>
            `;
            this.showToast('Erro ao buscar livros. Aguarde um momento.', 'error');
        }
    }

    // Demais métodos (toggleRead, editBook, deleteBook, renderBooks, etc.)
    async toggleRead(id) {
        const book = this.books.find(b => b.id === id);
        if (!book) return;

        const newReadStatus = !book.read;

        try {
            if (this.useAPI) {
                const response = await fetch(`${this.API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ read: newReadStatus })
                });
                
                if (!response.ok) throw new Error('Erro ao atualizar');
            }

            book.read = newReadStatus;
            if (!this.useAPI) this.saveBooks();

            await this.renderBooks();
            this.updateStats();
            
            const message = book.read ? '✅ Marcado como lido!' : '📖 Marcado como não lido!';
            this.showToast(message, 'success');

        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.showToast('😢 Erro ao atualizar status!', 'error');
        }
    }

    editBook(id) {
        const book = this.books.find(b => b.id === id);
        if (!book) return;

        const modal = document.createElement('div');
        modal.className = 'modal active animate-fade-in';
        modal.innerHTML = `
            <div class="modal-content animate-scale-in">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Livro</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editTitle">Título *</label>
                        <input type="text" id="editTitle" value="${this.escapeHtml(book.title)}" placeholder="Título do livro">
                    </div>
                    
                    <div class="form-group">
                        <label for="editAuthor">Autor *</label>
                        <input type="text" id="editAuthor" value="${this.escapeHtml(book.author)}" placeholder="Nome do autor">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editPages">Páginas</label>
                            <input type="number" id="editPages" value="${book.pages}" placeholder="Número de páginas" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="editGenre">Gênero</label>
                            <select id="editGenre">
                                ${this.getGenreOptions(book.genre)}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Avaliação</label>
                        <div class="stars-input" id="editStarsInput">
                            ${[1, 2, 3, 4, 5].map(rating => 
                                `<i class="${rating <= book.rating ? 'fas' : 'far'} fa-star ${rating <= book.rating ? 'active' : ''}" 
                                    data-rating="${rating}">
                                 </i>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary" id="saveEdit">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const editStars = modal.querySelectorAll('#editStarsInput i');
        let editRating = book.rating;

        editStars.forEach(star => {
            star.addEventListener('click', () => {
                editRating = parseInt(star.dataset.rating);
                editStars.forEach(s => {
                    if (s.dataset.rating <= editRating) {
                        s.className = 'fas fa-star active';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });

        modal.querySelector('#saveEdit').addEventListener('click', async () => {
            const newTitle = modal.querySelector('#editTitle').value.trim();
            const newAuthor = modal.querySelector('#editAuthor').value.trim();
            const newPages = parseInt(modal.querySelector('#editPages').value) || 0;
            const newGenre = modal.querySelector('#editGenre').value;

            if (!newTitle || !newAuthor) {
                this.showToast('⚠️ Título e autor são obrigatórios!', 'error');
                return;
            }

            try {
                if (this.useAPI) {
                    const response = await fetch(`${this.API_URL}/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: newTitle,
                            author: newAuthor,
                            pages: newPages,
                            genre: newGenre,
                            rating: editRating
                        })
                    });
                    if (!response.ok) throw new Error('Erro ao atualizar');
                }

                book.title = newTitle;
                book.author = newAuthor;
                book.pages = newPages;
                book.genre = newGenre;
                book.rating = editRating;

                if (!this.useAPI) this.saveBooks();

                modal.remove();
                await this.renderBooks();
                this.updateStats();
                this.showToast('✏️ Livro atualizado com sucesso!', 'success');

            } catch (error) {
                console.error('Erro ao editar:', error);
                this.showToast('😢 Erro ao salvar alterações!', 'error');
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        setTimeout(() => {
            modal.querySelector('#editTitle')?.focus();
        }, 300);
    }

    async deleteBook(id) {
        const book = this.books.find(b => b.id === id);
        if (!book) return;

        const bookElement = document.querySelector(`[data-id="${id}"]`);
        
        if (bookElement) {
            bookElement.style.animation = 'shake 0.5s ease';
        }

        setTimeout(async () => {
            const confirmed = await this.confirmDialog(
                '🗑️ Remover Livro',
                `Tem certeza que deseja remover "${book.title}"?`,
                'Remover',
                'Cancelar'
            );

            if (!confirmed) return;

            try {
                if (this.useAPI) {
                    const response = await fetch(`${this.API_URL}/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) throw new Error('Erro ao remover');
                }

                this.books = this.books.filter(b => b.id !== id);
                if (!this.useAPI) this.saveBooks();

                await this.renderBooks();
                this.updateStats();
                this.showToast('🗑️ Livro removido com sucesso!', 'success');

            } catch (error) {
                console.error('Erro ao deletar:', error);
                this.showToast('😢 Erro ao remover livro!', 'error');
            }
        }, 300);
    }

    async renderBooks() {
        const booksList = document.getElementById('booksList');
        if (!booksList) return;

        let filteredBooks = this.applyFilters(this.books);
        filteredBooks = this.sortBooks(filteredBooks);

        if (filteredBooks.length === 0) {
            booksList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        booksList.innerHTML = filteredBooks.map((book, index) => `
            <div class="book-item animate-scale-in" 
                 data-id="${book.id}" 
                 style="animation-delay: ${index * 0.1}s"
                 onmouseenter="this.style.transform='translateY(-8px) scale(1.02)'"
                 onmouseleave="this.style.transform='translateY(0) scale(1)'">
                
                <span class="genre-badge">
                    <i class="fas fa-tag"></i> ${book.genre}
                </span>
                
                <h3 title="${this.escapeHtml(book.title)}">
                    ${this.truncateText(book.title, 40)}
                </h3>
                
                <p class="author">
                    <i class="fas fa-user-edit"></i> ${this.truncateText(book.author, 30)}
                </p>
                
                ${book.pages ? `
                <p class="pages">
                    <i class="fas fa-book"></i> ${book.pages} páginas
                </p>` : ''}
                
                <div class="stars-display">
                    ${this.renderStarsDisplay(book.rating)}
                </div>
                
                <div>
                    <span class="status ${book.read ? 'read' : 'unread'}" 
                          onclick="bookManager.toggleRead(${book.id})"
                          title="${book.read ? 'Marcar como não lido' : 'Marcar como lido'}">
                        <i class="fas ${book.read ? 'fa-check-circle' : 'fa-book-open'}"></i>
                        ${book.read ? ' Lido' : ' Não lido'}
                    </span>
                </div>
                
                <div class="book-actions">
                    <button class="edit-btn" onclick="bookManager.editBook(${book.id})" title="Editar livro">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="delete-btn" onclick="bookManager.deleteBook(${book.id})" title="Remover livro">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            </div>
        `).join('');
    }

    getEmptyStateHTML() {
        const messages = [
            {
                icon: '📚',
                title: 'Sua biblioteca está vazia',
                description: 'Adicione livros manualmente ou busque na API do Google Books!'
            },
            {
                icon: '🔍',
                title: 'Nenhum livro encontrado',
                description: 'Tente ajustar os filtros ou adicionar novos livros'
            }
        ];

        const message = this.books.length === 0 ? messages[0] : messages[1];

        return `
            <div class="empty-state animate-fade-in" style="grid-column: 1/-1;">
                <div class="empty-state-icon">${message.icon}</div>
                <h3>${message.title}</h3>
                <p>${message.description}</p>
                ${this.books.length === 0 ? `
                <button class="btn-primary" onclick="document.getElementById('title').focus()">
                    <i class="fas fa-plus"></i> Adicionar Primeiro Livro
                </button>
                ` : ''}
            </div>
        `;
    }

    renderStarsDisplay(rating) {
        let starsHtml = '<div class="stars-container">';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += '<i class="fas fa-star active-star"></i>';
            } else if (i - 0.5 <= rating) {
                starsHtml += '<i class="fas fa-star-half-alt active-star"></i>';
            } else {
                starsHtml += '<i class="far fa-star empty-star"></i>';
            }
        }
        starsHtml += '</div>';
        return starsHtml;
    }

    applyFilters(books) {
        let filtered = [...books];
        if (this.currentFilter === 'read') {
            filtered = filtered.filter(b => b.read);
        } else if (this.currentFilter === 'unread') {
            filtered = filtered.filter(b => !b.read);
        }
        if (this.currentGenreFilter && this.currentGenreFilter !== 'all') {
            filtered = filtered.filter(b => b.genre === this.currentGenreFilter);
        }
        return filtered;
    }

    sortBooks(books) {
        const sorted = [...books];
        switch (this.currentSort) {
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'title':
                return sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
            case 'rating':
                return sorted.sort((a, b) => b.rating - a.rating);
            case 'pages':
                return sorted.sort((a, b) => b.pages - a.pages);
            case 'newest':
            default:
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    }

    updateStats() {
        const total = this.books.length;
        const read = this.books.filter(b => b.read).length;
        const ratedBooks = this.books.filter(b => b.rating > 0);
        const avgRating = ratedBooks.length > 0 
            ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
            : '0.0';

        const totalBooksEl = document.getElementById('totalBooks');
        const readBooksEl = document.getElementById('readBooks');
        const avgRatingEl = document.getElementById('avgRating');

        if (totalBooksEl) totalBooksEl.textContent = total;
        if (readBooksEl) readBooksEl.textContent = read;
        if (avgRatingEl) avgRatingEl.textContent = avgRating;

        this.animateNumber(totalBooksEl, total);
        this.animateNumber(readBooksEl, read);
    }

    animateNumber(element, target) {
        if (!element) return;
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const duration = 500;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            element.textContent = Math.round(current + diff * eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    saveBooks() {
        try {
            localStorage.setItem('booksPro', JSON.stringify(this.books));
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showToast('⚠️ Erro ao salvar dados localmente', 'error');
        }
    }

    resetForm() {
        const form = document.getElementById('addBookForm');
        if (form) form.reset();
        
        this.selectedRating = 0;
        document.getElementById('rating').value = '0';
        
        const stars = document.querySelectorAll('#starsInput i');
        this.highlightStars(stars, 0);
    }

    getGenreOptions(selectedGenre = '') {
        const genres = [
            'Ficção Científica', 'Fantasia', 'Romance', 'Terror',
            'Suspense', 'Drama', 'Aventura', 'Biografia',
            'Técnico', 'Poesia', 'Outro'
        ];
        return genres.map(genre => 
            `<option value="${genre}" ${genre === selectedGenre ? 'selected' : ''}>${genre}</option>`
        ).join('');
    }

    mapGenre(apiGenre) {
        const genreMap = {
            'Fiction': 'Ficção Científica',
            'Fantasy': 'Fantasia',
            'Romance': 'Romance',
            'Horror': 'Terror',
            'Thriller': 'Suspense',
            'Drama': 'Drama',
            'Adventure': 'Aventura',
            'Biography': 'Biografia',
            'Poetry': 'Poesia',
            'Science': 'Técnico'
        };

        for (const [key, value] of Object.entries(genreMap)) {
            if (apiGenre.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        return 'Outro';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    unescapeHtml(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent;
    }

    shakeElement(element) {
        if (!element) return;
        element.style.animation = 'shake 0.5s ease';
        element.style.borderColor = 'var(--danger)';
        
        setTimeout(() => {
            element.style.animation = '';
            element.style.borderColor = '';
        }, 500);
        element.focus();
    }

    showLoading(show) {
        this.isLoading = show;
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (show) {
            if (!loadingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="spinner"></div>';
                document.body.appendChild(overlay);
            }
        } else {
            loadingOverlay?.remove();
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `${icons[type] || ''} ${message}`;
        toast.className = `toast ${type} show`;

        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    confirmDialog(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active animate-fade-in';
            modal.innerHTML = `
                <div class="modal-content confirm-dialog animate-scale-in">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelConfirm">
                            ${cancelText}
                        </button>
                        <button class="btn-danger" id="confirmAction">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#confirmAction').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            modal.querySelector('#cancelConfirm').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }
}

class DataManager {
    static exportBooks(bookManager) {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            books: bookManager.books,
            stats: {
                total: bookManager.books.length,
                read: bookManager.books.filter(b => b.read).length,
                avgRating: bookManager.books.filter(b => b.rating > 0).length > 0
                    ? (bookManager.books.filter(b => b.rating > 0).reduce((sum, b) => sum + b.rating, 0) / 
                       bookManager.books.filter(b => b.rating > 0).length).toFixed(1)
                    : '0.0'
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogo-livros-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        bookManager.showToast('💾 Backup exportado com sucesso!', 'success');
    }

    static importBooks(bookManager) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    if (!data.books || !Array.isArray(data.books)) {
                        throw new Error('Formato inválido');
                    }

                    if (confirm(`Importar ${data.books.length} livros? Livros existentes serão mantidos.`)) {
                        data.books.forEach(book => {
                            if (!book.id) book.id = Date.now() + Math.random();
                            book.createdAt = book.createdAt || new Date().toISOString();
                            bookManager.books.unshift(book);
                        });
                        
                        bookManager.saveBooks();
                        bookManager.renderBooks();
                        bookManager.updateStats();
                        bookManager.showToast(`📥 ${data.books.length} livros importados!`, 'success');
                    }
                } catch (error) {
                    bookManager.showToast('❌ Arquivo inválido!', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.bookManager = new BookManager();
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            DataManager.exportBooks(window.bookManager);
        }
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            DataManager.importBooks(window.bookManager);
        }
    });

    console.log('📚 Catálogo de Livros Pro inicializado!');
    console.log('💡 Dicas:');
    console.log('  - Ctrl+K: Buscar livros');
    console.log('  - Ctrl+N: Adicionar novo livro');
    console.log('  - Ctrl+E: Exportar dados');
    console.log('  - Ctrl+I: Importar dados');
});
