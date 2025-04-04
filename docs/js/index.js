async function main() {
    const buttons = document.querySelectorAll('#tabs button');
    const pages = document.querySelectorAll('.page-wrapper');
    const border = document.querySelector('#border');

    buttons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const target = e.target;
            const page = target.dataset.page;
            window.location.hash = page;
        })
    });

    function showTab() {
        let hash = window.location.hash.substring(1);
    
        if (!hash) {
            hash = 'home'; 
            history.replaceState(null, null, `#${hash}`);
        }

        const currentPage = document.getElementById(hash);

        if(!currentPage) {
            window.location.hash = 'home';
            return;
        }

        buttons.forEach(btn => {
            btn.style.backgroundColor = '#101828';
        });

        pages.forEach(_page => {
            _page.classList.remove('visible');
        });

        
        const pageColor = currentPage.dataset.color;

        currentPage.classList.add('visible');

        const pageButton = document.querySelector(`#tabs button[data-page="${hash}"]`);

        pageButton.style.backgroundColor = pageColor;
        border.style.backgroundColor = getComputedStyle(pageButton).borderColor;
    }

    window.addEventListener('hashchange', showTab);
    showTab();
}